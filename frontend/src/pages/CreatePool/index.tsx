import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  Box,
  MenuItem,
  TextField,
} from "@material-ui/core";
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import { WBNB_ADDR } from '../../abis/address'

declare let window: any;

interface Props {
  account: any;
}

const CreatePool: React.FC<Props> = ({ account }) => {
  const [step, setStep] = useState(1);
  const [staking, setStaking] = useState('');
  const [stakinginfo, setStakingInfo] = useState('');
  const [reward, setReward] = useState('');
  const [reflection, setReflection] = useState(WBNB_ADDR);
  const [rewardinfo, setRewardInfo] = useState<any>(null);
  const [reflectioninfo, setReflectionInfo] = useState<any>(null);
  const [dividend, setDividend] = useState('');
  const [dividendinfo, setDividendinfo] = useState<any>(null);
  const [stakingtype, setStakingType] = useState('Lock');
  const [duration, setDuration] = useState(30);
  const [supply, setSupply] = useState(0);
  const [rewardbalance, setRewardBalance] = useState(0);
  const [poolimage, setPoolImage] = useState('');
  const [tokensite, setTokenSite] = useState('');
  const [withdrawFee, setWithdrawFee] = useState(0);
  const [depositFee, setDepositFee] = useState(0);
  const [hasdividend, setHasdividend] = useState(false);
  return (
    <StyledContainer>
      {step === 1 ? <Step1 setStep={setStep} /> : ''}
      {step === 2 ?
        <Step2
          setStep={setStep}
          staking={staking}
          setStaking={setStaking}
          stakinginfo={stakinginfo}
          setStakingInfo={setStakingInfo}
          reward={reward}
          setReward={setReward}
          rewardinfo={rewardinfo}
          setRewardInfo={setRewardInfo}
          reflection={reflection}
          reflectioninfo={reflectioninfo}
          setReflectionInfo={setReflectionInfo}
          setReflection={setReflection}
          dividend={dividend}
          setDividend={setDividend}
          dividendinfo={dividendinfo}
          setDividendinfo={setDividendinfo}
          setRewardBalance={setRewardBalance}
          account={account} />
        : ''}
      {step === 3 ?
        <Step3
          setStep={setStep}
          stakingtype={stakingtype}
          setStakingType={setStakingType}
          duration={duration}
          setDuration={setDuration}
          supply={supply}
          setSupply={setSupply}
          rewardbalance={rewardbalance}
          depositFee={depositFee}
          setDepositFee={setDepositFee}
          withdrawFee={withdrawFee}
          setWithdrawFee={setWithdrawFee}
          hasdividend={hasdividend}
          setHasdividend={setHasdividend} />
        : ''}
      {step === 4 ?
        <Step4
          setStep={setStep}
          poolimage={poolimage}
          setPoolImage={setPoolImage}
          tokensite={tokensite}
          setTokenSite={setTokenSite} />
        : ''}
      {step === 5 ?
        <Step5
          account={account}
          staking={staking}
          stakinginfo={stakinginfo}
          reward={reward}
          rewardinfo={rewardinfo}
          reflection={reflection}
          reflectioninfo={reflectioninfo}
          dividend={dividend}
          dividendinfo={dividendinfo}
          stakingtype={stakingtype}
          duration={duration}
          supply={supply}
          poolimage={poolimage}
          tokensite={tokensite}
          depositFee={depositFee}
          withdrawFee={withdrawFee}
          hasdividend={hasdividend}
          setStep={setStep}
        /> : ''}
    </StyledContainer>
  );
};
const StyledContainer = styled(Box)`
  min-height: 100vh;
  width: 100%;
  background-image: url("/images/background.png");
  background-size: 100% 100%;
  position: relative;
  padding-top: 150px;
  color : white;
  padding-bottom : 50px;
`;
export default CreatePool;
