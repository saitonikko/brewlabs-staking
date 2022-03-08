import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
    Box, OutlinedInput
} from "@material-ui/core";
import Button from '../../components/Button'
import Web3 from 'web3';
import BrewLabsStakingFactoryABI from '../../abis/BrewLabsStakingFactory.json';
import ERC20ABI from '../../abis/ERC20ABI.json';
import { BREWLABSSTAKINGFACTORY_ADDR, BREWLABSLOCK_IMPLEMENTE, BREWLABSUNLOCK_IMPLEMENTE, ROUTER_ADDR, WBNB_ADDR } from '../../abis/address';

declare let window: any;

interface Props {
    account: any;
    staking: any;
    stakinginfo: any;
    reward: any;
    reflection: any;
    stakingtype: any;
    duration: any;
    supply: any;
    poolimage: any;
    tokensite: any;
    setStep: any;
    rewardinfo: any;
    reflectioninfo: any;
    dividend: any;
    dividendinfo: any;
    withdrawFee: any;
    depositFee: any;
    hasdividend: any;
}

const Step2: React.FC<Props> = ({ account, setStep, staking, stakinginfo, reward, reflection, stakingtype, duration, supply, poolimage, tokensite, rewardinfo, reflectioninfo, dividend, dividendinfo, withdrawFee, depositFee, hasdividend }) => {

    const titles = ['Staking Token', 'Name', 'Symbol', 'Decimals', 'Total Supply', 'Reward Token', 'Name', 'Symbol', 'Decimals', 'Total Supply', 'Reflection Token', 'Name', 'Symbol', 'Decimals', 'Total Supply', 'Dividend Token', 'Name', 'Symbol', 'Decimals', 'Total Supply', 'Staking Type', 'Duration', 'Supply', 'Site', 'Rate', 'Deposit Fee', 'Withdraw Fee', 'Mint Fee'];
    const showdata = [
        staking,
        stakinginfo.name,
        stakinginfo.symbol,
        stakinginfo.decimals,
        stakinginfo.totalSupply,
        reward,
        rewardinfo.name,
        rewardinfo.symbol,
        rewardinfo.decimals,
        rewardinfo.totalSupply,
        reflection,
        reflectioninfo.name,
        reflectioninfo.symbol,
        reflectioninfo.decimals,
        reflectioninfo.totalSupply,
        dividend.length ? dividend : '0x00000000000000',
        dividendinfo ? dividendinfo.name : -1,
        dividendinfo ? dividendinfo.symbol : -1,
        dividendinfo ? dividendinfo.decimals : -1,
        dividendinfo ? dividendinfo.totalSupply : -1,
        stakingtype,
        duration,
        supply,
        tokensite,
        supply / duration / 28800,
        depositFee,
        withdrawFee,
        '3 BNB'
    ]
    const onConfirm = async () => {
        const factoryContract = new window.web3.eth.Contract(BrewLabsStakingFactoryABI, BREWLABSSTAKINGFACTORY_ADDR);
        const tokenContract = new window.web3.eth.Contract(ERC20ABI, reward);
        try {
            const _supply = '0x' + (BigInt(Math.pow(10, rewardinfo.decimals)) * BigInt(supply)).toString(16);
            await tokenContract.methods.approve(BREWLABSSTAKINGFACTORY_ADDR, _supply).send({ from: account });
            const fee = await factoryContract.methods.establishFee().call();
            if (stakingtype === 'Lock') {
                const result = await factoryContract.methods.establishLock(
                    BREWLABSLOCK_IMPLEMENTE,
                    staking,
                    reward,
                    dividend.length ? dividend : '0x0000000000000000000000000000000000000000',
                    ROUTER_ADDR,
                    (staking.toLowerCase() === reward.toLowerCase() ? [] : [staking, WBNB_ADDR, reward]),
                    (reflection.toLowerCase() === staking.toLowerCase() ? [] : (reflection.toLowerCase() === WBNB_ADDR.toLocaleLowerCase() ? [reflection, staking] : [reflection, WBNB_ADDR, staking])),
                    {
                        _duration: duration,
                        _withdrawFee: withdrawFee,
                        _depositFee: depositFee,
                        _rate: '0x' + Math.round((supply * Math.pow(10, rewardinfo.decimals) / duration / 28800)).toString(16),
                    },
                    poolimage,
                    tokensite,
                    '0x' + (supply * Math.pow(10, rewardinfo.decimals)).toString(16)
                ).send({ from: account, value: fee })
                console.log(result.events.EstablishLock.returnValues.staking);
            }
            else {
                const result = await factoryContract.methods.establishUnlock(
                    BREWLABSUNLOCK_IMPLEMENTE,
                    staking,
                    reward,
                    dividend.length ? dividend : '0x0000000000000000000000000000000000000000',
                    ['0x' + Math.round((supply * Math.pow(10, rewardinfo.decimals) / duration / 28800)).toString(16), duration],
                    [depositFee, withdrawFee],
                    ROUTER_ADDR,
                    (staking.toLowerCase() === reward.toLowerCase() ? [] : [staking, WBNB_ADDR, reward]),
                    (reflection.toLowerCase() === staking.toLowerCase() ? [] : (reflection.toLowerCase() === WBNB_ADDR.toLocaleLowerCase() ? [reflection, staking] : [reflection, WBNB_ADDR, staking])),
                    hasdividend,
                    [poolimage, tokensite],
                    '0x' + (supply * Math.pow(10, rewardinfo.decimals)).toString(16)

                ).send({ from: account, value: fee })
                console.log(result.events.EstablishLock.returnValues.staking);
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    return (
        <StyledContainer>
            <Box>

            </Box>
            <Box border={'1px solid rgb(253,136,19)'} padding={'20px'} borderRadius={'10px'} style={{ overflowY: 'scroll', boxSizing: 'content-box' }} maxHeight={'calc(100vh - 300px)'}>
                {titles.map((data: any, i: any) => {
                    const flag = (i > 0 && i < 5) || (i > 5 && i < 10) || (i > 10 && i < 15) || (i > 15 && i < 20);
                    if (showdata[i] === -1) return;
                    return <Box display={'flex'} justifyContent={'space-between'} padding={'10px'} borderBottom={flag ? 'unset' : '1px solid grey'} fontSize={flag ? '12px' : '16px'} color={flag ? 'darkgrey' : 'white'}>
                        <Box>{data}</Box>
                        <Box>{showdata[i]}</Box>
                    </Box>
                })}
            </Box>
            <ButtonGroup>
                <Button
                    type="primary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    onClick={() => setStep(4)}
                >
                    Prev
                </Button>
                <Button
                    type="secondary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    onClick={() => onConfirm()}
                >
                    Confirm
                </Button>
            </ButtonGroup>
        </StyledContainer>
    )
}
export default Step2;

const StyledContainer = styled(Box)`
    color : white;
    width : 60%;
    margin : 0 auto;
`
const ButtonGroup = styled(Box)`
    margin : 0 auto;
    margin-top : 50px;
    display : flex;
    width : 220px;
    justify-content : space-between;
`