import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
    Box, MenuItem, OutlinedInput, TextField
} from "@material-ui/core";
import Button from '../../components/Button'
import Web3 from 'web3';
import ERC20ABI from '../../abis/ERC20ABI.json'
import { WBNB_ADDR, BUSD_ADDR } from '../../abis/address'

declare let window: any;

interface Props {
    setStep: any;
    staking: any;
    setStaking: any;
    stakinginfo: any;
    setStakingInfo: any;
    reward: any;
    setReward: any;
    reflection: any;
    setReflection: any;
    setRewardBalance: any;
    account: any;
    rewardinfo: any;
    setRewardInfo: any;
    reflectioninfo: any;
    setReflectionInfo: any;
    dividend: any;
    setDividend: any;
    dividendinfo: any;
    setDividendinfo: any;
}

const Step2: React.FC<Props> = ({ account, setStep, staking, setStaking, stakinginfo, setStakingInfo, reward, setReward, rewardinfo, setRewardInfo, reflection, reflectioninfo, setReflectionInfo, setReflection, dividend, setDividend, dividendinfo, setDividendinfo, setRewardBalance }) => {

    const titles = ['Name', 'Symbol', 'Decimals', 'Total Supply'];
    useEffect(() => {
        async function fetchData() {
            try {
                if (Web3.utils.isAddress(reward)) {
                    const rewardContract = new window.web3.eth.Contract(ERC20ABI, reward);
                    const name = await rewardContract.methods.name().call();
                    const symbol = await rewardContract.methods.symbol().call();
                    const decimals = await rewardContract.methods.decimals().call();
                    const totalSupply = (BigInt(await rewardContract.methods.totalSupply().call()) / BigInt(Math.pow(10, decimals))).toString();
                    const balance = (BigInt(await rewardContract.methods.balanceOf(account).call()) / BigInt(Math.pow(10, decimals))).toString();
                    setRewardInfo({ name, symbol, decimals, totalSupply, data: [name, symbol, decimals, totalSupply] });
                    setRewardBalance(balance);
                }
                if (Web3.utils.isAddress(staking)) {
                    const stakingContract = new window.web3.eth.Contract(ERC20ABI, staking);
                    const name = await stakingContract.methods.name().call();
                    const symbol = await stakingContract.methods.symbol().call();
                    const decimals = await stakingContract.methods.decimals().call();
                    const totalSupply = (BigInt(await stakingContract.methods.totalSupply().call()) / BigInt(Math.pow(10, decimals))).toString();
                    setStakingInfo({ name, symbol, decimals, totalSupply, data: [name, symbol, decimals, totalSupply] })
                }
                if (Web3.utils.isAddress(reflection)) {
                    const rewardContract = new window.web3.eth.Contract(ERC20ABI, reflection);
                    const name = await rewardContract.methods.name().call();
                    const symbol = await rewardContract.methods.symbol().call();
                    const decimals = await rewardContract.methods.decimals().call();
                    const totalSupply = (BigInt(await rewardContract.methods.totalSupply().call()) / BigInt(Math.pow(10, decimals))).toString();
                    setReflectionInfo({ name, symbol, decimals, totalSupply, data: [name, symbol, decimals, totalSupply] })
                }
                if (Web3.utils.isAddress(dividend)) {
                    const dividendContract = new window.web3.eth.Contract(ERC20ABI, dividend);
                    const name = await dividendContract.methods.name().call();
                    const symbol = await dividendContract.methods.symbol().call();
                    const decimals = await dividendContract.methods.decimals().call();
                    const totalSupply = (BigInt(await dividendContract.methods.totalSupply().call()) / BigInt(Math.pow(10, decimals))).toString();
                    setDividendinfo({ name, symbol, decimals, totalSupply, data: [name, symbol, decimals, totalSupply] })
                }
            }
            catch (error) {
                console.log(error);
            }
        }
        fetchData();
    }, [reward, reflection, staking, dividend])
    return (
        <StyledContainer>
            <InputFields>
                <Box>
                    <Box color={"Tomato"} fontSize={'20px'}>
                        What is the contract address for staking token in the staking pool
                    </Box>
                    <CustomInput
                        className="amountinput"
                        placeholder="0x..."
                        value={staking}
                        onChange={(e: any) => setStaking(e.target.value)} />
                    <Box mt={'20px'}>
                        {stakinginfo && stakinginfo.data.map((data: any, i: any) => {
                            return <Box display={'flex'} justifyContent={'space-between'} mt={'10px'}>
                                <Box>{titles[i]}</Box>
                                <Box>{data}</Box>
                            </Box>
                        })}
                    </Box>
                </Box>
                <Box mt={'30px'}>
                    <Box color={"Tomato"} fontSize={'20px'}>
                        What is the contract address for reward token in the staking pool
                    </Box>
                    <CustomInput
                        className="amountinput"
                        placeholder="0x..."
                        value={reward}
                        onChange={(e: any) => setReward(e.target.value)} />
                    <Box mt={'20px'}>
                        {rewardinfo && rewardinfo.data.map((data: any, i: any) => {
                            return <Box display={'flex'} justifyContent={'space-between'} mt={'10px'}>
                                <Box>{titles[i]}</Box>
                                <Box>{data}</Box>
                            </Box>
                        })}
                    </Box>
                </Box>
                <Box mt={'30px'}>
                    <Box color={"Tomato"} fontSize={'20px'}>
                        What is the contract address for the reflections for the token being rewarded
                    </Box>
                    <CustomSelect
                        select
                        placeholder="Ex: PinkMonn"
                        InputProps={{ style: { color: "#c494ff" } }}
                        variant="outlined"
                        value={reflection}
                        onChange={(e: any) => {
                            setReflection(e.target.value)
                        }}
                    >
                        <MenuItem value={WBNB_ADDR}>BNB</MenuItem>
                        <MenuItem value={BUSD_ADDR}>BUSD</MenuItem>
                    </CustomSelect>

                    <Box mt={'20px'}>
                        {reflectioninfo && reflectioninfo.data.map((data: any, i: any) => {
                            return <Box display={'flex'} justifyContent={'space-between'} mt={'10px'}>
                                <Box>{titles[i]}</Box>
                                <Box>{data}</Box>
                            </Box>
                        })}
                    </Box>
                </Box>
                <Box mt={'30px'}>
                    <Box color={"Tomato"} fontSize={'20px'}>
                        What is the contract address for Dividend token in the staking pool
                    </Box>
                    <CustomInput
                        className="amountinput"
                        placeholder="0x..."
                        value={dividend}
                        onChange={(e: any) => setDividend(e.target.value)} />
                    <Box mt={'20px'}>
                        {dividendinfo && dividendinfo.data.map((data: any, i: any) => {
                            return <Box display={'flex'} justifyContent={'space-between'} mt={'10px'}>
                                <Box>{titles[i]}</Box>
                                <Box>{data}</Box>
                            </Box>
                        })}
                    </Box>
                </Box>
            </InputFields>
            <ButtonGroup>
                <Button
                    type="primary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    onClick={() => setStep(1)}
                >
                    Prev
                </Button>
                <Button
                    type="secondary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    disabled={!(stakinginfo && rewardinfo && reflectioninfo && ((dividend.length && dividendinfo) || !dividend.length))}
                    onClick={() => stakinginfo && rewardinfo && reflectioninfo && ((dividend.length && dividendinfo) || !dividend.length) && setStep(3)}
                >
                    Next
                </Button>
            </ButtonGroup>
        </StyledContainer >
    )
}
export default Step2;

const StyledContainer = styled(Box)`
    color : white;
`
const ButtonGroup = styled(Box)`
    margin : 0 auto;
    margin-top : 50px;
    display : flex;
    width : 220px;
    justify-content : space-between;
`
const CustomInput = styled(OutlinedInput)`
    font-size: 16px !important;
    width: 100%;
    border-radius: 10px!important;
    border : 1px solid rgb(253, 136, 19);
    color : white!important;
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
`;
const InputFields = styled(Box)`
    width : 60%;
    margin : 0 auto;
`
const CustomSelect = styled(TextField)`
  width: 100%;
  margin-top: 10px;
  border-radius: 10px !important;
  border: 1px solid rgb(253, 136, 19) !important;
  color: white !important;
  margin: 0;
  > div > svg {
    fill: white !important;
  }
`;