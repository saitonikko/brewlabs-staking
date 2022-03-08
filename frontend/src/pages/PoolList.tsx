import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Box, InputAdornment, OutlinedInput } from "@material-ui/core";
import Button from "components/Button";
import Web3 from "web3";
import BrewLabsStakingFactoryABI from "abis/BrewLabsStakingFactory.json";
import BrewlabsLockupABI from "abis/BrewlabsLockup.json";
import BrewlabsStakingABI from "abis/BrewlabsStaking.json";
import ERC20ABI from "abis/ERC20ABI.json";
import { BREWLABSSTAKINGFACTORY_ADDR } from "abis/address";

declare let window: any;

interface Props {
  account: any;
}
const PoolList: React.FC<Props> = ({ account }) => {
  const [pools, setPools] = useState<any>([]);
  useEffect(() => {
    async function fetchData() {
      const factoryContract = new window.web3.eth.Contract(BrewLabsStakingFactoryABI, BREWLABSSTAKINGFACTORY_ADDR);
      const _pools = await factoryContract.methods.getStakings().call();
      let temp = [];
      for (let i = 0; i < _pools.length; i++) {
        const _pool = await factoryContract.methods.stakings(_pools[i]).call();
        if (_pool.lock === true) {
          const poolContract = new window.web3.eth.Contract(BrewlabsLockupABI, _pool.staking);
          const startReward = await poolContract.methods.startBlock().call();
          const lockup = await poolContract.methods.lockups(2).call();
          const staking = await poolContract.methods.stakingToken().call();
          const stakingContract = new window.web3.eth.Contract(ERC20ABI, staking);
          const stakingsymbol = await stakingContract.methods.symbol().call();
          const earn = await poolContract.methods.earnedToken().call();
          const earnContract = new window.web3.eth.Contract(ERC20ABI, earn);
          const earnsymbol = await earnContract.methods.symbol().call();
          const reflection = await poolContract.methods.reflectionToStakedPath(0).call();
          const reflectionContract = new window.web3.eth.Contract(ERC20ABI, reflection);
          const reflecitonsymbol = await reflectionContract.methods.symbol().call();
          temp.push({
            staking: { address: staking, symbol: stakingsymbol },
            earn: { address: earn, symbol: earnsymbol },
            reflection: { address: reflection, symbol: reflecitonsymbol },
            lockup,
            duration: lockup.duration,
            info: _pool,
            startReward : startReward / 1
          });
        }
        else {
          const poolContract = new window.web3.eth.Contract(BrewlabsStakingABI, _pool.staking);
          const startReward = await poolContract.methods.startBlock().call();
          const staking = await poolContract.methods.stakingToken().call();
          const stakingContract = new window.web3.eth.Contract(ERC20ABI, staking);
          const stakingsymbol = await stakingContract.methods.symbol().call();
          const earn = await poolContract.methods.earnedToken().call();
          const earnContract = new window.web3.eth.Contract(ERC20ABI, earn);
          const earnsymbol = await earnContract.methods.symbol().call();
          const reflection = await poolContract.methods.reflectionToStakedPath(0).call();
          const reflectionContract = new window.web3.eth.Contract(ERC20ABI, reflection);
          const reflecitonsymbol = await reflectionContract.methods.symbol().call();
          const duration = await poolContract.methods.duration().call();
          temp.push({
            staking: { address: staking, symbol: stakingsymbol },
            earn: { address: earn, symbol: earnsymbol },
            reflection: { address: reflection, symbol: reflecitonsymbol },
            duration,
            info: _pool,
            startReward : startReward / 1
          });
        }
      }
      setPools(temp);
      console.log(temp);
    }
    fetchData();
  }, []);

  return (
    <StyledContainer>
      {pools.map((data: any) => {
        return <EscrowPanel>
          <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
            <Box width={'50px'} height={'50px'} >
              <img src={data.info.stakingURI} alt={"stakingURI"} width={'100%'} height={'100%'} style={{ borderRadius: '50%' }} />
            </Box>
            <Box display={'flex'} color={'tomato'} fontSize={'21px'} fontWeight={'bold'}>
              Earn - {data.earn.symbol}
            </Box>
          </Box>
          <Box display={'flex'} justifyContent={'space-between'} mt={'20px'}>
            <Box>Staking Token</Box>
            <Box>{data.staking.symbol}</Box>
          </Box>
          <Box display={'flex'} justifyContent={'space-between'} mt={'12px'}>
            <Box>Reflection Token</Box>
            <Box>{data.reflection.symbol}</Box>
          </Box>
          <Box display={'flex'} justifyContent={'space-between'} mt={'12px'}>
            <Box>Duration</Box>
            <Box>{data.duration}</Box>
          </Box>
          <Box display={'flex'} justifyContent={'space-between'} mt={'12px'}>
            <Box>Start Reward</Box>
            <Box>{data.startReward ? 'True' : 'False'}</Box>
          </Box>
          <Box display={'flex'} justifyContent={'space-between'} mt={'20px'}>
            <Box>Lock Type</Box>
            <Box>{data.info.lock ? "LockUp" : "Manual"}</Box>
          </Box>
          <Box display={"flex"} justifyContent={"flex-end"} mt={"30px"}>
            <Button
              type="secondary"
              onClick={() =>
                (window.location.href = "/pool/" + data.info.staking)
              }
              width={"130px"}
              height={"40px"}
              fontSize={"16px"}
            >
              View Pool
            </Button>
          </Box>
        </EscrowPanel>
      })}
    </StyledContainer>
  );
};
const EscrowPanel = styled(Box)`
  color: white;
  font-size: 18px;
  padding: 30px 20px 20px 20px;
  border: 1px solid rgb(253, 136, 19);
  border-radius: 10px;
  width: 300px;
  margin-right : 30px;
  height : fit-content;
`;
const StyledContainer = styled(Box)`
  min-height: 100vh;
  width: 100%;
  background-image: url("/images/background.png");
  background-size: 100% 100%;
  position: relative;
  padding: 150px 100px 50px 100px;
  display : flex;
`;

export default PoolList;
