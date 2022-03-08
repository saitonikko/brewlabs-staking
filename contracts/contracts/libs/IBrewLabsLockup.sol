pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBrewLabsLockup {
    function initialize(
        IERC20 _stakingToken,
        IERC20 _earnedToken,
        IERC20 _dividendToken,
        address _uniRouter,
        address[] memory _earnedToStakedPath,
        address[] memory _reflectionToStakedPath,
        address _factory,
        address _owner
    ) external;

    function addLockup(
        uint256 _duration,
        uint256 _depositFee,
        uint256 _withdrawFee,
        uint256 _rate
    ) external;

    function transferOwnership(address newOwner) external;
}
