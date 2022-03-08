import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  Box,
  InputAdornment,
  MenuItem,
  OutlinedInput,
  TextField,
} from "@material-ui/core";
import Button from "components/Button";
import Web3 from "web3";
import ERC20ABI from "abis/ERC20ABI.json";
import BrewlabsStakingABI from "abis/BrewlabsStaking.json";
import BrewlabsLockupABI from "abis/BrewlabsLockup.json";
import BrewlabsStakingFactoryABI from "abis/BrewLabsStakingFactory.json";
import { BREWLABSSTAKINGFACTORY_ADDR } from "abis/address";
import { useParams } from "react-router-dom";

declare let window: any;

interface Props {
  account: any;
}
const Pool: React.FC<Props> = ({ account }) => {
  const { id }: any = useParams();
  const [pooldata, setPoolData] = useState<any>(null);
  const [pending, setPending] = useState(false);
  const titles = ['Staking Token', 'Reflection Token', 'Duration', 'Deposit Fee', 'Withdraw Fee', 'Total Staked', 'Avaialble Reward', 'Token Site', 'Start Reward', 'Staking Type'];
  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const poolFactoryContract = new window.web3.eth.Contract(BrewlabsStakingFactoryABI, BREWLABSSTAKINGFACTORY_ADDR);
      const info = await poolFactoryContract.methods.stakings(id).call();
      if (info.lock) {
        const poolContract = new window.web3.eth.Contract(BrewlabsLockupABI, id);
        const staking = await poolContract.methods.stakingToken().call();
        const stakingContract = new window.web3.eth.Contract(ERC20ABI, staking);
        const stakingsymbol = await stakingContract.methods.symbol().call();
        const earn = await poolContract.methods.earnedToken().call();
        const earnContract = new window.web3.eth.Contract(ERC20ABI, earn);
        const earnsymbol = await earnContract.methods.symbol().call();
        const earndecimals = await earnContract.methods.decimals().call();
        const reflection = await poolContract.methods.reflectionToStakedPath(0).call();
        const reflectionContract = new window.web3.eth.Contract(ERC20ABI, reflection);
        const reflecitonsymbol = await reflectionContract.methods.symbol().call();
        const lock = await poolContract.methods.lockups(2).call();
        const availableToken = (BigInt(await poolContract.methods.availableRewardTokens().call()) / BigInt(Math.pow(10, earndecimals))).toString();
        const startReward = await poolContract.methods.startBlock().call() / 1;
        const owner = await poolContract.methods.owner().call();
        setPoolData({
          owner: owner.toLowerCase(),
          poolimage: info.stakingURI,
          availableToken: Number(availableToken),
          earnsymbol,
          startReward: startReward / 1,
          data: [stakingsymbol, reflecitonsymbol, lock.duration, lock.depositFee, lock.withdrawFee, lock.totalStaked, availableToken, info.site, startReward ? 'True' : 'False', info.lock ? 'LockUp' : 'Manual']
        })
      }
      else {
        const poolContract = new window.web3.eth.Contract(BrewlabsStakingABI, id);
        const staking = await poolContract.methods.stakingToken().call();
        const stakingContract = new window.web3.eth.Contract(ERC20ABI, staking);
        const stakingsymbol = await stakingContract.methods.symbol().call();
        const earn = await poolContract.methods.earnedToken().call();
        const earnContract = new window.web3.eth.Contract(ERC20ABI, earn);
        const earnsymbol = await earnContract.methods.symbol().call();
        const earndecimals = await earnContract.methods.decimals().call();
        const reflection = await poolContract.methods.reflectionToStakedPath(0).call();
        const reflectionContract = new window.web3.eth.Contract(ERC20ABI, reflection);
        const reflecitonsymbol = await reflectionContract.methods.symbol().call();
        const duration = await poolContract.methods.duration().call();
        const withdrawFee = await poolContract.methods.withdrawFee().call();
        const depositFee = await poolContract.methods.depositFee().call();
        const totalStaked = await poolContract.methods.totalStaked().call();
        const availableToken = (BigInt(await poolContract.methods.availableRewardTokens().call()) / BigInt(Math.pow(10, earndecimals))).toString();
        const startReward = await poolContract.methods.startBlock().call() / 1;
        const owner = await poolContract.methods.owner().call();
        setPoolData({
          owner: owner.toLowerCase(),
          poolimage: info.stakingURI,
          availableToken: Number(availableToken),
          earnsymbol,
          startReward: startReward / 1,
          data: [stakingsymbol, reflecitonsymbol, duration, depositFee, withdrawFee, totalStaked, availableToken, info.site, startReward ? 'true' : 'false', info.lock ? 'LockUp' : 'Manual']
        })
      }
    }
    fetchData();
  }, [id])

  const onStartReward = async () => {
    setPending(true);
    const poolContract = new window.web3.eth.Contract(BrewlabsStakingABI, id);
    try {
      await poolContract.methods.startReward().send({ from: account });
      setPending(false);
    }
    catch (error) {
      console.log(error);
      setPending(false);
    }
  }
  const onStopReward = async () => {
    setPending(true);
    const poolContract = new window.web3.eth.Contract(BrewlabsStakingABI, id);
    try {
      await poolContract.methods.stopReward().send({ from: account });
      setPending(false);
    }
    catch (error) {
      console.log(error);
      setPending(false);
    }
  }

  return (
    <StyledContainer>
      <Box display={'flex'} justifyContent={'space-between'} width={'1000px'} mx={'auto'}>
        <Box border={'1px solid rgb(253,136,19)'} padding={'20px'} borderRadius={'10px'} style={{ overflowY: 'scroll', boxSizing: 'content-box' }} maxHeight={'calc(100vh - 300px)'} width={'500px'}>
          <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
            <Box width={'50px'} height={'50px'} >
              <img src={pooldata && pooldata.poolimage} alt={"stakingURI"} width={'100%'} height={'100%'} style={{ borderRadius: '50%' }} />
            </Box>
            <Box display={'flex'} color={'tomato'} fontSize={'21px'} fontWeight={'bold'}>
              Earn - {pooldata && pooldata.earnsymbol}
            </Box>
          </Box>
          {pooldata && titles.map((data: any, i: any) => {
            return <Box display={'flex'} justifyContent={'space-between'} padding={'10px'} borderBottom={'1px solid grey'} color={'white'}>
              <Box>{data}</Box>
              <Box>{pooldata.data[i]}</Box>
            </Box>
          })}
        </Box>
        <Box border={'1px solid rgb(253,136,19)'} padding={'20px'} borderRadius={'10px'} width={'400px'} height={'fit-content'}>
          <Box color={'tomato'} fontSize={'36px'} fontWeight={'bold'}>Owner Zone</Box>
          <Box display={'flex'} justifyContent={'space-between'} color={'white'} fontSize={'21px'} mt={'10px'}>
            <Box>Available Rewards</Box>
            <Box>{pooldata && pooldata.availableToken}</Box>
          </Box>
          {pooldata && pooldata.owner === account.toLowerCase() ? <Box>
            <Box mt={'10px'}>
              <Button
                type="secondary"
                width={"100%"}
                height={"35px"}
                fontSize={"14px"}
                disabled={pending || !pooldata.availableToken || pooldata.startReward}
                onClick={() => !pending && pooldata.availableToken && !pooldata.startReward && onStartReward()}
              >
                Start Reward
              </Button>
            </Box>
            <Box mt={'10px'}>
              <Button
                type="secondary"
                width={"100%"}
                height={"35px"}
                fontSize={"14px"}
                disabled={pending || !pooldata.startReward}
                onClick={() => !pending && pooldata.startReward && onStopReward()}
              >
                Stop Reward
              </Button>
            </Box>
          </Box> : ''
          }
        </Box>
      </Box>
    </StyledContainer>
  );
};
const StyledContainer = styled(Box)`
  min-height: 100vh;
  width: 100%;
  background-image: url("/images/background.png");
  background-size: 100% 100%;
  position: relative;
  padding: 180px 100px 50px 100px;
  font-size: 18px;
`;

export default Pool;
