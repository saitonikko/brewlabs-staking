// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./libs/IUniRouter02.sol";
import "./libs/IWETH.sol";

interface IToken {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the token decimals.
     */
    function decimals() external view returns (uint8);

    /**
     * @dev Returns the token symbol.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the token name.
     */
    function name() external view returns (string memory);
}

contract BrewlabsLockup is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // The address of the smart chef factory
    address public POOL_FACTORY;

    // Whether it is initialized
    bool public isInitialized;
    uint256 public duration = 365; // 365 days

    // Whether a limit is set for users
    bool public hasUserLimit;
    // The pool limit (0 if none)
    uint256 public poolLimitPerUser;

    // The block number when staking starts.
    uint256 public startBlock;
    // The block number when staking ends.
    uint256 public bonusEndBlock;

    // swap router and path, slipPage
    uint256 public slippageFactor = 950; // 5% default slippage tolerance
    uint256 public constant slippageFactorUL = 995;

    address public uniRouterAddress;
    address[] public reflectionToStakedPath;
    address[] public earnedToStakedPath;

    address public walletA;
    address public buyBackWallet = 0xE1f1dd010BBC2860F81c8F90Ea4E38dB949BB16F;
    uint256 public performanceFee = 0.0005 ether;

    // The precision factor
    uint256 public PRECISION_FACTOR;
    uint256 public PRECISION_FACTOR_REFLECTION;

    // The staked token
    IERC20 public stakingToken;
    // The earned token
    IERC20 public earnedToken;
    // The dividend token of staking token
    IERC20 public dividendToken;

    // Accrued token per share
    uint256 public accDividendPerShare;

    uint256 public totalStaked;

    uint256 private totalEarned;
    uint256 private totalReflections;
    uint256 private reflectionDebt;

    struct Lockup {
        uint8 stakeType;
        uint256 duration;
        uint256 depositFee;
        uint256 withdrawFee;
        uint256 rate;
        uint256 accTokenPerShare;
        uint256 lastRewardBlock;
        uint256 totalStaked;
    }

    struct UserInfo {
        uint256 amount; // How many staked tokens the user has provided
        uint256 locked;
        uint256 available;
    }

    struct Stake {
        uint8 stakeType;
        uint256 amount; // amount to stake
        uint256 duration; // the lockup duration of the stake
        uint256 end; // when does the staking period end
        uint256 rewardDebt; // Reward debt
        uint256 reflectionDebt; // Reflection debt
    }
    uint256 constant MAX_STAKES = 256;

    Lockup[] public lockups;
    mapping(address => Stake[]) public userStakes;
    mapping(address => UserInfo) public userStaked;

    event Deposit(address indexed user, uint256 stakeType, uint256 amount);
    event Withdraw(address indexed user, uint256 stakeType, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event AdminTokenRecovered(address tokenRecovered, uint256 amount);

    event NewStartAndEndBlocks(uint256 startBlock, uint256 endBlock);
    event LockupUpdated(
        uint8 _type,
        uint256 _duration,
        uint256 _fee0,
        uint256 _fee1,
        uint256 _rate
    );
    event NewPoolLimit(uint256 poolLimitPerUser);
    event RewardsStop(uint256 blockNumber);

    event ServiceInfoUpadted(address _addr, uint256 _fee);
    event DurationUpdated(uint256 _duration);

    event SetSettings(
        uint256 _slippageFactor,
        address _uniRouter,
        address[] _path0,
        address[] _path1,
        address _walletA
    );

    constructor() {
        POOL_FACTORY = msg.sender;
    }

    /*
     * @notice Initialize the contract
     * @param _stakingToken: staked token address
     * @param _earnedToken: earned token address
     * @param _dividendToken: reflection token address
     * @param _uniRouter: uniswap router address for swap tokens
     * @param _earnedToStakedPath: swap path to compound (earned -> staking path)
     * @param _reflectionToStakedPath: swap path to compound (reflection -> staking path)
     */
    function initialize(
        IERC20 _stakingToken,
        IERC20 _earnedToken,
        IERC20 _dividendToken,
        address _uniRouter,
        address[] memory _earnedToStakedPath,
        address[] memory _reflectionToStakedPath,
        address _factory,
        address _owner
    ) external {
        require(!isInitialized, "Already initialized");

        // Make this contract initialized
        isInitialized = true;

        POOL_FACTORY = _factory;
        stakingToken = _stakingToken;
        earnedToken = _earnedToken;
        dividendToken = _dividendToken;

        walletA = _owner;

        uint256 decimalsRewardToken = uint256(
            IToken(address(earnedToken)).decimals()
        );
        require(decimalsRewardToken < 30, "Must be inferior to 30");
        PRECISION_FACTOR = uint256(10**(uint256(40).sub(decimalsRewardToken)));

        uint256 decimalsdividendToken = 18;
        if (address(dividendToken) != address(0x0)) {
            decimalsdividendToken = uint256(
                IToken(address(dividendToken)).decimals()
            );
            require(decimalsdividendToken < 30, "Must be inferior to 30");
        }
        PRECISION_FACTOR_REFLECTION = uint256(
            10**(uint256(40).sub(decimalsdividendToken))
        );

        uniRouterAddress = _uniRouter;
        earnedToStakedPath = _earnedToStakedPath;
        reflectionToStakedPath = _reflectionToStakedPath;

        lockups.push(Lockup(0, 45, 0, 30, 599315068493149000000000, 0, 0, 0)); // 1.5% liquidity
        lockups.push(Lockup(1, 90, 0, 10, 799086757990866000000000, 0, 0, 0)); // 2% liquidity

        _resetAllowances();
        _transferOwnership(_factory);
    }

    /*
     * @notice Deposit staked tokens and collect reward tokens (if any)
     * @param _amount: amount to withdraw (in earnedToken)
     */
    function deposit(uint256 _amount, uint8 _stakeType) external nonReentrant {
        require(_amount > 0, "Amount should be greator than 0");
        require(_stakeType < lockups.length, "Invalid stake type");

        _updatePool(_stakeType);

        UserInfo storage user = userStaked[msg.sender];
        Stake[] storage stakes = userStakes[msg.sender];
        Lockup storage lockup = lockups[_stakeType];

        uint256 pending = 0;
        uint256 pendingCompound = 0;
        uint256 pendingReflection = 0;
        uint256 compounded = 0;
        for (uint256 j = 0; j < stakes.length; j++) {
            Stake storage stake = stakes[j];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            pendingReflection = pendingReflection.add(
                stake
                    .amount
                    .mul(accDividendPerShare)
                    .div(PRECISION_FACTOR_REFLECTION)
                    .sub(stake.reflectionDebt)
            );

            uint256 _pending = stake
                .amount
                .mul(lockup.accTokenPerShare)
                .div(PRECISION_FACTOR)
                .sub(stake.rewardDebt);
            if (stake.end > block.timestamp) {
                pendingCompound = pendingCompound.add(_pending);

                if (
                    address(stakingToken) != address(earnedToken) &&
                    _pending > 0
                ) {
                    uint256 _beforeAmount = stakingToken.balanceOf(
                        address(this)
                    );
                    _safeSwap(_pending, earnedToStakedPath, address(this));
                    uint256 _afterAmount = stakingToken.balanceOf(
                        address(this)
                    );
                    _pending = _afterAmount.sub(_beforeAmount);
                }
                compounded = compounded.add(_pending);
                stake.amount = stake.amount.add(_pending);
            } else {
                pending = pending.add(_pending);
            }
            stake.rewardDebt = stake.amount.mul(lockup.accTokenPerShare).div(
                PRECISION_FACTOR
            );
            stake.reflectionDebt = stake.amount.mul(accDividendPerShare).div(
                PRECISION_FACTOR_REFLECTION
            );
        }

        if (pending > 0) {
            require(
                availableRewardTokens() >= pending,
                "Insufficient reward tokens"
            );
            earnedToken.safeTransfer(address(msg.sender), pending);

            if (totalEarned > pending) {
                totalEarned = totalEarned.sub(pending);
            } else {
                totalEarned = 0;
            }
        }

        if (pendingCompound > 0) {
            require(
                availableRewardTokens() >= pendingCompound,
                "Insufficient reward tokens"
            );

            if (totalEarned > pendingCompound) {
                totalEarned = totalEarned.sub(pendingCompound);
            } else {
                totalEarned = 0;
            }
        }

        if (pendingReflection > 0) {
            if (address(dividendToken) == address(0x0)) {
                payable(msg.sender).transfer(pendingReflection);
            } else {
                dividendToken.safeTransfer(
                    address(msg.sender),
                    pendingReflection
                );
            }
            totalReflections = totalReflections.sub(pendingReflection);
        }

        uint256 beforeAmount = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(
            address(msg.sender),
            address(this),
            _amount
        );
        uint256 afterAmount = stakingToken.balanceOf(address(this));
        uint256 realAmount = afterAmount.sub(beforeAmount);

        if (hasUserLimit) {
            require(
                realAmount.add(user.amount) <= poolLimitPerUser,
                "User amount above limit"
            );
        }
        if (lockup.depositFee > 0) {
            uint256 fee = realAmount.mul(lockup.depositFee).div(10000);
            if (fee > 0) {
                stakingToken.safeTransfer(walletA, fee);
                realAmount = realAmount.sub(fee);
            }
        }

        _addStake(_stakeType, msg.sender, lockup.duration, realAmount);

        user.amount = user.amount.add(realAmount).add(compounded);
        lockup.totalStaked = lockup.totalStaked.add(realAmount).add(compounded);
        totalStaked = totalStaked.add(realAmount).add(compounded);

        emit Deposit(msg.sender, _stakeType, realAmount.add(compounded));
    }

    function _addStake(
        uint8 _stakeType,
        address _account,
        uint256 _duration,
        uint256 _amount
    ) internal {
        Stake[] storage stakes = userStakes[_account];

        uint256 end = block.timestamp.add(_duration.mul(1 days));
        uint256 i = stakes.length;
        require(i < MAX_STAKES, "Max stakes");

        stakes.push(); // grow the array
        // find the spot where we can insert the current stake
        // this should make an increasing list sorted by end
        while (i != 0 && stakes[i - 1].end > end) {
            // shift it back one
            stakes[i] = stakes[i - 1];
            i -= 1;
        }

        Lockup storage lockup = lockups[_stakeType];

        // insert the stake
        Stake storage newStake = stakes[i];
        newStake.stakeType = _stakeType;
        newStake.duration = _duration;
        newStake.end = end;
        newStake.amount = _amount;
        newStake.rewardDebt = newStake.amount.mul(lockup.accTokenPerShare).div(
            PRECISION_FACTOR
        );
        newStake.reflectionDebt = newStake.amount.mul(accDividendPerShare).div(
            PRECISION_FACTOR_REFLECTION
        );
    }

    /*
     * @notice Withdraw staked tokens and collect reward tokens
     * @param _amount: amount to withdraw (in earnedToken)
     */
    function withdraw(uint256 _amount, uint8 _stakeType) external nonReentrant {
        require(_amount > 0, "Amount should be greator than 0");
        require(_stakeType < lockups.length, "Invalid stake type");

        _updatePool(_stakeType);

        UserInfo storage user = userStaked[msg.sender];
        Stake[] storage stakes = userStakes[msg.sender];
        Lockup storage lockup = lockups[_stakeType];

        uint256 pending = 0;
        uint256 pendingCompound = 0;
        uint256 pendingReflection = 0;
        uint256 compounded = 0;
        uint256 remained = _amount;
        for (uint256 j = 0; j < stakes.length; j++) {
            Stake storage stake = stakes[j];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;
            if (remained == 0) break;

            uint256 _pending = stake
                .amount
                .mul(lockup.accTokenPerShare)
                .div(PRECISION_FACTOR)
                .sub(stake.rewardDebt);
            uint256 _pendingReflection = stake
                .amount
                .mul(accDividendPerShare)
                .div(PRECISION_FACTOR_REFLECTION)
                .sub(stake.reflectionDebt);
            pendingReflection = pendingReflection.add(_pendingReflection);

            if (stake.end > block.timestamp) {
                pendingCompound = pendingCompound.add(_pending);

                if (
                    address(stakingToken) != address(earnedToken) &&
                    _pending > 0
                ) {
                    uint256 _beforeAmount = stakingToken.balanceOf(
                        address(this)
                    );
                    _safeSwap(_pending, earnedToStakedPath, address(this));
                    uint256 _afterAmount = stakingToken.balanceOf(
                        address(this)
                    );
                    _pending = _afterAmount.sub(_beforeAmount);
                }
                compounded = compounded.add(_pending);
                stake.amount = stake.amount.add(_pending);
            } else {
                pending = pending.add(_pending);
                if (stake.amount > remained) {
                    stake.amount = stake.amount.sub(remained);
                    remained = 0;
                } else {
                    remained = remained.sub(stake.amount);
                    stake.amount = 0;
                }
            }
            stake.rewardDebt = stake.amount.mul(lockup.accTokenPerShare).div(
                PRECISION_FACTOR
            );
            stake.reflectionDebt = stake.amount.mul(accDividendPerShare).div(
                PRECISION_FACTOR_REFLECTION
            );
        }

        if (pending > 0) {
            require(
                availableRewardTokens() >= pending,
                "Insufficient reward tokens"
            );
            earnedToken.safeTransfer(address(msg.sender), pending);

            if (totalEarned > pending) {
                totalEarned = totalEarned.sub(pending);
            } else {
                totalEarned = 0;
            }
        }

        if (pendingCompound > 0) {
            require(
                availableRewardTokens() >= pendingCompound,
                "Insufficient reward tokens"
            );

            if (totalEarned > pendingCompound) {
                totalEarned = totalEarned.sub(pendingCompound);
            } else {
                totalEarned = 0;
            }

            emit Deposit(msg.sender, _stakeType, compounded);
        }

        if (pendingReflection > 0) {
            if (address(dividendToken) == address(0x0)) {
                payable(msg.sender).transfer(pendingReflection);
            } else {
                dividendToken.safeTransfer(
                    address(msg.sender),
                    pendingReflection
                );
            }
            totalReflections = totalReflections.sub(pendingReflection);
        }

        uint256 realAmount = _amount.sub(remained);
        user.amount = user.amount.sub(realAmount).add(pendingCompound);
        lockup.totalStaked = lockup.totalStaked.sub(realAmount).add(
            pendingCompound
        );
        totalStaked = totalStaked.sub(realAmount).add(pendingCompound);

        if (realAmount > 0) {
            if (lockup.withdrawFee > 0) {
                uint256 fee = realAmount.mul(lockup.withdrawFee).div(10000);
                stakingToken.safeTransfer(walletA, fee);
                realAmount = realAmount.sub(fee);
            }

            stakingToken.safeTransfer(address(msg.sender), realAmount);
        }

        emit Withdraw(msg.sender, _stakeType, realAmount);
    }

    function claimReward(uint8 _stakeType) external payable nonReentrant {
        if (_stakeType >= lockups.length) return;
        if (startBlock == 0) return;

        _transferPerformanceFee();
        _updatePool(_stakeType);

        UserInfo storage user = userStaked[msg.sender];
        Stake[] storage stakes = userStakes[msg.sender];
        Lockup storage lockup = lockups[_stakeType];

        uint256 pending = 0;
        uint256 pendingCompound = 0;
        uint256 compounded = 0;
        for (uint256 j = 0; j < stakes.length; j++) {
            Stake storage stake = stakes[j];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            uint256 _pending = stake
                .amount
                .mul(lockup.accTokenPerShare)
                .div(PRECISION_FACTOR)
                .sub(stake.rewardDebt);

            if (stake.end > block.timestamp) {
                pendingCompound = pendingCompound.add(_pending);

                if (
                    address(stakingToken) != address(earnedToken) &&
                    _pending > 0
                ) {
                    uint256 _beforeAmount = stakingToken.balanceOf(
                        address(this)
                    );
                    _safeSwap(_pending, earnedToStakedPath, address(this));
                    uint256 _afterAmount = stakingToken.balanceOf(
                        address(this)
                    );
                    _pending = _afterAmount.sub(_beforeAmount);
                }
                compounded = compounded.add(_pending);
                stake.amount = stake.amount.add(_pending);
                stake.reflectionDebt = stake
                    .amount
                    .mul(accDividendPerShare)
                    .div(PRECISION_FACTOR_REFLECTION)
                    .sub(
                        (stake.amount.sub(_pending))
                            .mul(accDividendPerShare)
                            .div(PRECISION_FACTOR_REFLECTION)
                            .sub(stake.reflectionDebt)
                    );
            } else {
                pending = pending.add(_pending);
            }
            stake.rewardDebt = stake.amount.mul(lockup.accTokenPerShare).div(
                PRECISION_FACTOR
            );
        }

        if (pending > 0) {
            require(
                availableRewardTokens() >= pending,
                "Insufficient reward tokens"
            );
            earnedToken.safeTransfer(address(msg.sender), pending);

            if (totalEarned > pending) {
                totalEarned = totalEarned.sub(pending);
            } else {
                totalEarned = 0;
            }
        }

        if (pendingCompound > 0) {
            require(
                availableRewardTokens() >= pendingCompound,
                "Insufficient reward tokens"
            );

            if (totalEarned > pendingCompound) {
                totalEarned = totalEarned.sub(pendingCompound);
            } else {
                totalEarned = 0;
            }

            user.amount = user.amount.add(compounded);
            lockup.totalStaked = lockup.totalStaked.add(compounded);
            totalStaked = totalStaked.add(compounded);

            emit Deposit(msg.sender, _stakeType, compounded);
        }
    }

    function claimDividend(uint8 _stakeType) external payable nonReentrant {
        if (_stakeType >= lockups.length) return;
        if (startBlock == 0) return;

        _transferPerformanceFee();
        _updatePool(_stakeType);

        Stake[] storage stakes = userStakes[msg.sender];

        uint256 pendingReflection = 0;
        for (uint256 j = 0; j < stakes.length; j++) {
            Stake storage stake = stakes[j];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            uint256 _pendingReflection = stake
                .amount
                .mul(accDividendPerShare)
                .div(PRECISION_FACTOR_REFLECTION)
                .sub(stake.reflectionDebt);
            pendingReflection = pendingReflection.add(_pendingReflection);

            stake.reflectionDebt = stake.amount.mul(accDividendPerShare).div(
                PRECISION_FACTOR_REFLECTION
            );
        }

        if (pendingReflection > 0) {
            if (address(dividendToken) == address(0x0)) {
                payable(msg.sender).transfer(pendingReflection);
            } else {
                dividendToken.safeTransfer(
                    address(msg.sender),
                    pendingReflection
                );
            }
            totalReflections = totalReflections.sub(pendingReflection);
        }
    }

    function compoundReward(uint8 _stakeType) external payable nonReentrant {
        if (_stakeType >= lockups.length) return;
        if (startBlock == 0) return;

        _transferPerformanceFee();
        _updatePool(_stakeType);

        UserInfo storage user = userStaked[msg.sender];
        Stake[] storage stakes = userStakes[msg.sender];
        Lockup storage lockup = lockups[_stakeType];

        uint256 pending = 0;
        uint256 pendingCompound = 0;
        for (uint256 j = 0; j < stakes.length; j++) {
            Stake storage stake = stakes[j];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            uint256 _pending = stake
                .amount
                .mul(lockup.accTokenPerShare)
                .div(PRECISION_FACTOR)
                .sub(stake.rewardDebt);
            pending = pending.add(_pending);

            if (address(stakingToken) != address(earnedToken) && _pending > 0) {
                uint256 _beforeAmount = stakingToken.balanceOf(address(this));
                _safeSwap(_pending, earnedToStakedPath, address(this));
                uint256 _afterAmount = stakingToken.balanceOf(address(this));
                _pending = _afterAmount.sub(_beforeAmount);
            }
            pendingCompound = pendingCompound.add(_pending);

            stake.amount = stake.amount.add(_pending);
            stake.rewardDebt = stake.amount.mul(lockup.accTokenPerShare).div(
                PRECISION_FACTOR
            );
            stake.reflectionDebt = stake
                .amount
                .mul(accDividendPerShare)
                .div(PRECISION_FACTOR_REFLECTION)
                .sub(
                    (stake.amount.sub(_pending))
                        .mul(accDividendPerShare)
                        .div(PRECISION_FACTOR_REFLECTION)
                        .sub(stake.reflectionDebt)
                );
        }

        if (pending > 0) {
            require(
                availableRewardTokens() >= pending,
                "Insufficient reward tokens"
            );

            if (totalEarned > pending) {
                totalEarned = totalEarned.sub(pending);
            } else {
                totalEarned = 0;
            }

            user.amount = user.amount.add(pendingCompound);
            lockup.totalStaked = lockup.totalStaked.add(pendingCompound);
            totalStaked = totalStaked.add(pendingCompound);

            emit Deposit(msg.sender, _stakeType, pendingCompound);
        }
    }

    function compoundDividend(uint8 _stakeType) external payable nonReentrant {
        if (_stakeType >= lockups.length) return;
        if (startBlock == 0) return;

        _transferPerformanceFee();
        _updatePool(_stakeType);

        UserInfo storage user = userStaked[msg.sender];
        Stake[] storage stakes = userStakes[msg.sender];
        Lockup storage lockup = lockups[_stakeType];

        uint256 pendingReflection = 0;
        uint256 pendingCompound = 0;
        for (uint256 j = 0; j < stakes.length; j++) {
            Stake storage stake = stakes[j];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            uint256 _pending = stake
                .amount
                .mul(accDividendPerShare)
                .div(PRECISION_FACTOR_REFLECTION)
                .sub(stake.reflectionDebt);
            pendingReflection = pendingReflection.add(_pending);

            if (
                address(stakingToken) != address(dividendToken) && _pending > 0
            ) {
                if (address(dividendToken) == address(0x0)) {
                    address wethAddress = IUniRouter02(uniRouterAddress).WETH();
                    IWETH(wethAddress).deposit{value: _pending}();
                }

                uint256 _beforeAmount = stakingToken.balanceOf(address(this));
                _safeSwap(_pending, reflectionToStakedPath, address(this));
                uint256 _afterAmount = stakingToken.balanceOf(address(this));

                _pending = _afterAmount.sub(_beforeAmount);
            }

            pendingCompound = pendingCompound.add(_pending);
            stake.amount = stake.amount.add(_pending);
            stake.rewardDebt = stake
                .amount
                .mul(lockup.accTokenPerShare)
                .div(PRECISION_FACTOR)
                .sub(
                    (stake.amount.sub(_pending))
                        .mul(lockup.accTokenPerShare)
                        .div(PRECISION_FACTOR)
                        .sub(stake.rewardDebt)
                );
            stake.reflectionDebt = stake.amount.mul(accDividendPerShare).div(
                PRECISION_FACTOR_REFLECTION
            );
        }

        totalReflections = totalReflections.sub(pendingReflection);
        if (pendingReflection > 0) {
            user.amount = user.amount.add(pendingCompound);
            lockup.totalStaked = lockup.totalStaked.add(pendingCompound);
            totalStaked = totalStaked.add(pendingCompound);

            emit Deposit(msg.sender, _stakeType, pendingCompound);
        }
    }

    function _transferPerformanceFee() internal {
        require(
            msg.value >= performanceFee,
            "should pay small gas to compound or harvest"
        );

        payable(buyBackWallet).transfer(performanceFee);
        if (msg.value > performanceFee) {
            payable(msg.sender).transfer(msg.value.sub(performanceFee));
        }
    }

    /*
     * @notice Withdraw staked tokens without caring about rewards
     * @dev Needs to be for emergency.
     */
    function emergencyWithdraw(uint8 _stakeType) external nonReentrant {
        if (_stakeType >= lockups.length) return;

        UserInfo storage user = userStaked[msg.sender];
        Stake[] storage stakes = userStakes[msg.sender];
        Lockup storage lockup = lockups[_stakeType];

        uint256 amountToTransfer = 0;
        for (uint256 j = 0; j < stakes.length; j++) {
            Stake storage stake = stakes[j];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            amountToTransfer = amountToTransfer.add(stake.amount);

            stake.amount = 0;
            stake.rewardDebt = 0;
            stake.reflectionDebt = 0;
        }

        if (amountToTransfer > 0) {
            stakingToken.safeTransfer(address(msg.sender), amountToTransfer);

            user.amount = user.amount.sub(amountToTransfer);
            lockup.totalStaked = lockup.totalStaked.sub(amountToTransfer);
            totalStaked = totalStaked.sub(amountToTransfer);
        }

        emit EmergencyWithdraw(msg.sender, amountToTransfer);
    }

    function rewardPerBlock(uint8 _stakeType) public view returns (uint256) {
        if (_stakeType >= lockups.length) return 0;

        return lockups[_stakeType].rate;
    }

    /**
     * @notice Available amount of reward token
     */
    function availableRewardTokens() public view returns (uint256) {
        if (address(earnedToken) == address(dividendToken)) return totalEarned;

        uint256 _amount = earnedToken.balanceOf(address(this));
        if (address(earnedToken) == address(stakingToken)) {
            if (_amount < totalStaked) return 0;
            return _amount.sub(totalStaked);
        }

        return _amount;
    }

    /**
     * @notice Available amount of reflection token
     */
    function availabledividendTokens() public view returns (uint256) {
        if (address(dividendToken) == address(0x0)) {
            return address(this).balance;
        }

        uint256 _amount = dividendToken.balanceOf(address(this));

        if (address(dividendToken) == address(earnedToken)) {
            if (_amount < totalEarned) return 0;
            _amount = _amount.sub(totalEarned);
        }

        if (address(dividendToken) == address(stakingToken)) {
            if (_amount < totalStaked) return 0;
            _amount = _amount.sub(totalStaked);
        }

        return _amount;
    }

    function userInfo(uint8 _stakeType, address _account)
        public
        view
        returns (
            uint256 amount,
            uint256 available,
            uint256 locked
        )
    {
        Stake[] storage stakes = userStakes[_account];

        for (uint256 i = 0; i < stakes.length; i++) {
            Stake storage stake = stakes[i];

            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            amount = amount.add(stake.amount);
            if (block.timestamp > stake.end) {
                available = available.add(stake.amount);
            } else {
                locked = locked.add(stake.amount);
            }
        }
    }

    /*
     * @notice View function to see pending reward on frontend.
     * @param _user: user address
     * @return Pending reward for a given user
     */
    function pendingReward(address _account, uint8 _stakeType)
        external
        view
        returns (uint256)
    {
        if (_stakeType >= lockups.length) return 0;
        if (startBlock == 0) return 0;

        Stake[] storage stakes = userStakes[_account];
        Lockup storage lockup = lockups[_stakeType];

        if (lockup.totalStaked == 0) return 0;

        uint256 adjustedTokenPerShare = lockup.accTokenPerShare;
        if (
            block.number > lockup.lastRewardBlock &&
            lockup.totalStaked != 0 &&
            lockup.lastRewardBlock > 0
        ) {
            uint256 multiplier = _getMultiplier(
                lockup.lastRewardBlock,
                block.number
            );
            uint256 reward = multiplier.mul(lockup.rate);
            adjustedTokenPerShare = lockup.accTokenPerShare.add(
                reward.mul(PRECISION_FACTOR).div(lockup.totalStaked)
            );
        }

        uint256 pending = 0;
        for (uint256 i = 0; i < stakes.length; i++) {
            Stake storage stake = stakes[i];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            pending = pending.add(
                stake
                    .amount
                    .mul(adjustedTokenPerShare)
                    .div(PRECISION_FACTOR)
                    .sub(stake.rewardDebt)
            );
        }
        return pending;
    }

    function pendingDividends(address _account, uint8 _stakeType)
        external
        view
        returns (uint256)
    {
        if (_stakeType >= lockups.length) return 0;
        if (startBlock == 0) return 0;

        Stake[] storage stakes = userStakes[_account];

        if (totalStaked == 0) return 0;

        uint256 reflectionAmount = availabledividendTokens();
        uint256 sTokenBal = stakingToken.balanceOf(address(this));

        uint256 adjustedReflectionPerShare = accDividendPerShare.add(
            reflectionAmount
                .sub(totalReflections)
                .mul(PRECISION_FACTOR_REFLECTION)
                .div(sTokenBal)
        );

        uint256 pendingReflection = 0;
        for (uint256 i = 0; i < stakes.length; i++) {
            Stake storage stake = stakes[i];
            if (stake.stakeType != _stakeType) continue;
            if (stake.amount == 0) continue;

            pendingReflection = pendingReflection.add(
                stake
                    .amount
                    .mul(adjustedReflectionPerShare)
                    .div(PRECISION_FACTOR_REFLECTION)
                    .sub(stake.reflectionDebt)
            );
        }
        return pendingReflection;
    }

    /************************
     ** Admin Methods
     *************************/
    function harvest() external onlyOwner {
        _updatePool(0);

        uint256 _amount = stakingToken.balanceOf(address(this));
        _amount = _amount.sub(totalStaked);

        uint256 pendingReflection = _amount
            .mul(accDividendPerShare)
            .div(PRECISION_FACTOR_REFLECTION)
            .sub(reflectionDebt);
        if (pendingReflection > 0) {
            if (address(dividendToken) == address(0x0)) {
                payable(walletA).transfer(pendingReflection);
            } else {
                dividendToken.safeTransfer(walletA, pendingReflection);
            }
            totalReflections = totalReflections.sub(pendingReflection);
        }

        reflectionDebt = _amount.mul(accDividendPerShare).div(
            PRECISION_FACTOR_REFLECTION
        );
    }

    /*
     * @notice Deposit reward token
     * @dev Only call by owner. Needs to be for deposit of reward token when reflection token is same with reward token.
     */
    function depositRewards(uint256 _amount) external nonReentrant {
        require(_amount > 0);

        uint256 beforeAmt = earnedToken.balanceOf(address(this));
        earnedToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 afterAmt = earnedToken.balanceOf(address(this));

        totalEarned = totalEarned.add(afterAmt).sub(beforeAmt);
    }

    /*
     * @notice Withdraw reward token
     * @dev Only callable by owner. Needs to be for emergency.
     */
    function emergencyRewardWithdraw(uint256 _amount) external onlyOwner {
        require(block.number > bonusEndBlock, "Pool is running");
        if (address(earnedToken) != address(dividendToken)) {
            require(
                availableRewardTokens() >= _amount,
                "Insufficient reward tokens"
            );
        }

        earnedToken.safeTransfer(address(msg.sender), _amount);

        if (totalEarned > 0) {
            if (_amount > totalEarned) {
                totalEarned = 0;
            } else {
                totalEarned = totalEarned.sub(_amount);
            }
        }
    }

    /**
     * @notice It allows the admin to recover wrong tokens sent to the contract
     * @param _tokenAddress: the address of the token to withdraw
     * @param _tokenAmount: the number of tokens to withdraw
     * @dev This function is only callable by admin.
     */
    function recoverWrongTokens(address _tokenAddress, uint256 _tokenAmount)
        external
        onlyOwner
    {
        require(
            _tokenAddress != address(earnedToken),
            "Cannot be reward token"
        );

        if (_tokenAddress == address(stakingToken)) {
            uint256 tokenBal = stakingToken.balanceOf(address(this));
            require(
                _tokenAmount <= tokenBal.sub(totalStaked),
                "Insufficient balance"
            );
        }

        if (_tokenAddress == address(0x0)) {
            payable(msg.sender).transfer(_tokenAmount);
        } else {
            IERC20(_tokenAddress).safeTransfer(
                address(msg.sender),
                _tokenAmount
            );
        }

        emit AdminTokenRecovered(_tokenAddress, _tokenAmount);
    }

    function startReward() external onlyOwner {
        require(startBlock == 0, "Pool was already started");

        startBlock = block.number.add(100);
        bonusEndBlock = startBlock.add(duration * 28800);
        for (uint256 i = 0; i < lockups.length; i++) {
            lockups[i].lastRewardBlock = startBlock;
        }

        emit NewStartAndEndBlocks(startBlock, bonusEndBlock);
    }

    function stopReward() external onlyOwner {
        bonusEndBlock = block.number;
    }

    /*
     * @notice Update pool limit per user
     * @dev Only callable by owner.
     * @param _hasUserLimit: whether the limit remains forced
     * @param _poolLimitPerUser: new pool limit per user
     */
    function updatePoolLimitPerUser(
        bool _hasUserLimit,
        uint256 _poolLimitPerUser
    ) external onlyOwner {
        require(hasUserLimit, "Must be set");
        if (_hasUserLimit) {
            require(
                _poolLimitPerUser > poolLimitPerUser,
                "New limit must be higher"
            );
            poolLimitPerUser = _poolLimitPerUser;
        } else {
            hasUserLimit = _hasUserLimit;
            poolLimitPerUser = 0;
        }
        emit NewPoolLimit(poolLimitPerUser);
    }

    function updateLockup(
        uint8 _stakeType,
        uint256 _duration,
        uint256 _depositFee,
        uint256 _withdrawFee,
        uint256 _rate
    ) external onlyOwner {
        // require(block.number < startBlock, "Pool was already started");
        require(_stakeType < lockups.length, "Lockup Not found");
        require(_depositFee < 2000, "Invalid deposit fee");
        require(_withdrawFee < 2000, "Invalid withdraw fee");

        _updatePool(_stakeType);

        Lockup storage _lockup = lockups[_stakeType];
        _lockup.duration = _duration;
        _lockup.depositFee = _depositFee;
        _lockup.withdrawFee = _withdrawFee;
        _lockup.rate = _rate;

        emit LockupUpdated(
            _stakeType,
            _duration,
            _depositFee,
            _withdrawFee,
            _rate
        );
    }

    function addLockup(
        uint256 _duration,
        uint256 _depositFee,
        uint256 _withdrawFee,
        uint256 _rate
    ) external onlyOwner {
        require(_depositFee < 2000, "Invalid deposit fee");
        require(_withdrawFee < 2000, "Invalid withdraw fee");

        lockups.push();

        Lockup storage _lockup = lockups[lockups.length - 1];
        _lockup.duration = _duration;
        _lockup.depositFee = _depositFee;
        _lockup.withdrawFee = _withdrawFee;
        _lockup.rate = _rate;
        _lockup.lastRewardBlock = block.number;

        emit LockupUpdated(
            uint8(lockups.length - 1),
            _duration,
            _depositFee,
            _withdrawFee,
            _rate
        );
    }

    function setServiceInfo(address _addr, uint256 _fee) external {
        require(msg.sender == buyBackWallet, "setServiceInfo: FORBIDDEN");
        require(
            _addr != address(0x0) || _addr != buyBackWallet,
            "Invalid address"
        );

        buyBackWallet = _addr;
        performanceFee = _fee;

        emit ServiceInfoUpadted(_addr, _fee);
    }

    function setDuration(uint256 _duration) external onlyOwner {
        require(startBlock == 0, "Pool was already started");
        require(_duration >= 30, "lower limit reached");

        duration = _duration;
        emit DurationUpdated(_duration);
    }

    function setSettings(
        uint256 _slippageFactor,
        address _uniRouter,
        address[] memory _earnedToStakedPath,
        address[] memory _reflectionToStakedPath,
        address _feeAddr
    ) external onlyOwner {
        require(
            _slippageFactor <= slippageFactorUL,
            "_slippageFactor too high"
        );
        require(_feeAddr != address(0x0), "Invalid Address");

        slippageFactor = _slippageFactor;
        uniRouterAddress = _uniRouter;
        reflectionToStakedPath = _reflectionToStakedPath;
        earnedToStakedPath = _earnedToStakedPath;
        walletA = _feeAddr;

        emit SetSettings(
            _slippageFactor,
            _uniRouter,
            _earnedToStakedPath,
            _reflectionToStakedPath,
            _feeAddr
        );
    }

    function resetAllowances() external onlyOwner {
        _resetAllowances();
    }

    /************************
     ** Internal Methods
     *************************/
    /*
     * @notice Update reward variables of the given pool to be up-to-date.
     */
    function _updatePool(uint8 _stakeType) internal {
        // calc reflection rate
        if (totalStaked > 0) {
            uint256 reflectionAmount = availabledividendTokens();
            uint256 sTokenBal = stakingToken.balanceOf(address(this));

            accDividendPerShare = accDividendPerShare.add(
                reflectionAmount
                    .sub(totalReflections)
                    .mul(PRECISION_FACTOR_REFLECTION)
                    .div(sTokenBal)
            );

            totalReflections = reflectionAmount;
        }

        Lockup storage lockup = lockups[_stakeType];
        if (
            block.number <= lockup.lastRewardBlock ||
            lockup.lastRewardBlock == 0
        ) return;

        if (lockup.totalStaked == 0) {
            lockup.lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = _getMultiplier(
            lockup.lastRewardBlock,
            block.number
        );
        uint256 _reward = multiplier.mul(lockup.rate);
        lockup.accTokenPerShare = lockup.accTokenPerShare.add(
            _reward.mul(PRECISION_FACTOR).div(lockup.totalStaked)
        );
        lockup.lastRewardBlock = block.number;
    }

    /*
     * @notice Return reward multiplier over the given _from to _to block.
     * @param _from: block to start
     * @param _to: block to finish
     */
    function _getMultiplier(uint256 _from, uint256 _to)
        internal
        view
        returns (uint256)
    {
        if (_to <= bonusEndBlock) {
            return _to.sub(_from);
        } else if (_from >= bonusEndBlock) {
            return 0;
        } else {
            return bonusEndBlock.sub(_from);
        }
    }

    function _safeSwap(
        uint256 _amountIn,
        address[] memory _path,
        address _to
    ) internal {
        uint256[] memory amounts = IUniRouter02(uniRouterAddress).getAmountsOut(
            _amountIn,
            _path
        );
        uint256 amountOut = amounts[amounts.length.sub(1)];

        IUniRouter02(uniRouterAddress).swapExactTokensForTokens(
            _amountIn,
            amountOut.mul(slippageFactor).div(1000),
            _path,
            _to,
            block.timestamp.add(600)
        );
    }

    function _resetAllowances() internal {
        earnedToken.safeApprove(uniRouterAddress, uint256(0));
        earnedToken.safeIncreaseAllowance(uniRouterAddress, type(uint256).max);

        if (address(dividendToken) == address(0x0)) {
            address wethAddress = IUniRouter02(uniRouterAddress).WETH();
            IERC20(wethAddress).safeApprove(uniRouterAddress, uint256(0));
            IERC20(wethAddress).safeIncreaseAllowance(
                uniRouterAddress,
                type(uint256).max
            );
        } else {
            dividendToken.safeApprove(uniRouterAddress, uint256(0));
            dividendToken.safeIncreaseAllowance(
                uniRouterAddress,
                type(uint256).max
            );
        }
    }

    receive() external payable {}
}
