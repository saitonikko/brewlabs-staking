pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBrewLabsStaking {
    function initialize(
        IERC20 _stakingToken,
        IERC20 _earnedToken,
        address _dividendToken,
        uint256 _rewardPerBlock,
        uint256 _depositFee,
        uint256 _withdrawFee,
        address _uniRouter,
        address[] memory _earnedToStakedPath,
        address[] memory _reflectionToStakedPath,
        address _owner,
        bool _hasDividend
    ) external;

    function transferOwnership(address newOwner) external;

    function setOwner(address _owner) external;

    function setDuration(uint256 _duration) external;
}
