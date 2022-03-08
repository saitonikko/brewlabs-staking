pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./libs/IBrewLabsLockup.sol";
import "./libs/IBrewLabsStaking.sol";

contract BrewLabsStakingFactory is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    struct Staking {
        address staking;
        string stakingURI;
        string site;
        bool lock;
    }
    uint256 public establishFee;
    address[] public stakingAddrs;
    mapping(address => Staking) public stakings;
    address public feeAddress;
    struct Lock {
        uint256 _duration;
        uint256 _depositFee;
        uint256 _withdrawFee;
        uint256 _rate;
    }
    event EstablishLock(address indexed user, address indexed staking);

    constructor() {
        establishFee = 3 * 10**16;
        feeAddress = address(0xC2a5ea1d4406EC5fdd5eDFE0E13F59124C7e9803);
    }

    function setEstablishFee(uint256 _establishFee) public {
        establishFee = _establishFee;
    }

    function establishLock(
        address implementation,
        IERC20 _stakingToken,
        IERC20 _earnedToken,
        IERC20 _dividendToken,
        address _uniRouter,
        address[] memory _earnedToStakedPath,
        address[] memory _reflectionToStakedPath,
        Lock memory _locks,
        string memory _stakingURI,
        string memory _site,
        uint256 supply
    ) public payable {
        require(msg.value >= establishFee, "Not enough Fee");
        address staking = Clones.clone(implementation);
        IBrewLabsLockup(staking).initialize(
            _stakingToken,
            _earnedToken,
            _dividendToken,
            _uniRouter,
            _earnedToStakedPath,
            _reflectionToStakedPath,
            address(this),
            msg.sender
        );
        IBrewLabsLockup(staking).addLockup(
            _locks._duration,
            _locks._depositFee,
            _locks._withdrawFee,
            _locks._rate
        );
        IBrewLabsLockup(staking).transferOwnership(msg.sender);
        _earnedToken.safeApprove(staking, supply);
        _earnedToken.safeTransferFrom(msg.sender, staking, supply);
        Staking storage _staking = stakings[staking];
        _staking.site = _site;
        _staking.staking = staking;
        _staking.stakingURI = _stakingURI;
        _staking.lock = true;
        stakingAddrs.push(staking);
        stakings[staking] = _staking;
        emit EstablishLock(msg.sender, staking);
    }

    function establishUnlock(
        address implementation,
        IERC20 _stakingToken,
        IERC20 _earnedToken,
        address _dividendToken,
        uint256[2] memory values,
        uint256[2] memory _fees,
        address _uniRouter,
        address[] memory _earnedToStakedPath,
        address[] memory _reflectionToStakedPath,
        bool _hasDividend,
        string[2] memory _stakinginfo,
        uint256 supply
    ) public payable {
        require(msg.value >= establishFee, "Not enough Fee");
        address staking = Clones.clone(implementation);
        IBrewLabsStaking(staking).setOwner(address(this));
        IBrewLabsStaking(staking).setDuration(values[1]);
        IBrewLabsStaking(staking).initialize(
            _stakingToken,
            _earnedToken,
            _dividendToken,
            values[0],
            _fees[0],
            _fees[1],
            _uniRouter,
            _earnedToStakedPath,
            _reflectionToStakedPath,
            msg.sender,
            _hasDividend
        );
        _earnedToken.safeApprove(staking, supply);
        _earnedToken.safeTransferFrom(msg.sender, staking, supply);
        Staking storage _staking = stakings[staking];
        _staking.site = _stakinginfo[1];
        _staking.staking = staking;
        _staking.stakingURI = _stakinginfo[0];
        _staking.lock = false;
        stakingAddrs.push(staking);
        stakings[staking] = _staking;
        emit EstablishLock(msg.sender, staking);
    }

    function addStakings(address[] memory _stakingAddrs) public onlyOwner {
        for (uint256 i = 0; i < _stakingAddrs.length; i++)
            stakingAddrs.push(_stakingAddrs[i]);
    }

    function removeStakings(address[] memory _stakingAddrs) public onlyOwner {
        for (uint256 i = 0; i < stakingAddrs.length; i++)
            for (uint256 j = 0; j < _stakingAddrs.length; j++) {
                if (stakingAddrs[i] == _stakingAddrs[j]) remove(i);
            }
    }

    function remove(uint256 index) internal {
        if (index >= stakingAddrs.length) return;

        for (uint256 i = index; i < stakingAddrs.length - 1; i++) {
            stakingAddrs[i] = stakingAddrs[i + 1];
        }
        delete stakingAddrs[stakingAddrs.length - 1];
        stakingAddrs.pop();
    }

    function getStakings() public view returns (address[] memory) {
        return stakingAddrs;
    }

    function setFeeAddress(address _address) public onlyOwner {
        feeAddress = _address;
    }

    function removeStuckBNB() public onlyOwner {
        payable(feeAddress).transfer(address(this).balance);
    }
}
