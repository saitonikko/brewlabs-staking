import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
    Box, InputAdornment, MenuItem, OutlinedInput, TextField
} from "@material-ui/core";
import Button from '../../components/Button'
interface Props {
    setStep: any;
    stakingtype: any;
    setStakingType: any;
    duration: any;
    setDuration: any;
    supply: any;
    setSupply: any;
    rewardbalance: any;
    withdrawFee: any;
    setWithdrawFee: any;
    depositFee: any;
    setDepositFee: any;
    hasdividend: any;
    setHasdividend: any;
}
const Step3: React.FC<Props> = ({ setStep, stakingtype, setStakingType, duration, setDuration, supply, setSupply, rewardbalance, depositFee, setDepositFee, withdrawFee, setWithdrawFee, hasdividend, setHasdividend }) => {
    const [isvalidate, setIsValidate] = useState(false);
    useEffect(() => {
        if (duration && supply)
            setIsValidate(true);
        else
            setIsValidate(false);
    }, [duration, supply])
    return (
        <StyledContainer>
            <Box>
                <Box color={"Tomato"} fontSize={'20px'}>
                    What is the duration of the pool
                </Box>
                <CustomSelect
                    select
                    placeholder="Ex: PinkMonn"
                    InputProps={{ style: { color: "#c494ff" } }}
                    variant="outlined"
                    value={stakingtype}
                    onChange={(e: any) => {
                        if (e.target.value === 'Lock')
                            setDuration(30);
                        setStakingType(e.target.value)
                    }}
                >
                    <MenuItem value={"Lock"}>Lock</MenuItem>
                    <MenuItem value={"UnLock"}>UnLock</MenuItem>
                </CustomSelect>
            </Box>

            <Box mt={'20px'}>
                <Box color={"Tomato"} fontSize={'20px'}>
                    What is the duration of the pool
                </Box>
                {stakingtype === 'Lock' ?
                    <CustomSelect
                        select
                        placeholder="Ex: PinkMonn"
                        InputProps={{ style: { color: "#c494ff" } }}
                        variant="outlined"
                        value={duration}
                        onChange={(e: any) => setDuration(e.target.value)}
                    >
                        <MenuItem value={30}>30 days</MenuItem>
                        <MenuItem value={60}>60 days</MenuItem>
                        <MenuItem value={90}>90 days</MenuItem>
                        <MenuItem value={180}>180 days</MenuItem>
                        <MenuItem value={365}>365 days</MenuItem>
                    </CustomSelect>
                    :

                    <CustomInput
                        className="amountinput"
                        placeholder="0x..."
                        value={duration}
                        onChange={(e: any) => setDuration(e.target.value)} />
                }
            </Box>

            <Box mt={'20px'}>
                <Box color={"Tomato"} fontSize={'20px'}>
                    What is the amount of supply to add to the pool
                </Box>
                <CustomInput className="amountinput" type="number" value={supply}
                    endAdornment={
                        <InputAdornment position="start">
                            <Box
                                style={{ cursor: "pointer", background: "rgb(253, 136, 19)" }}
                                color={"white"}
                                padding={"10px"}
                                borderRadius={"10px"}
                                fontSize={"30px"}
                                onClick={() => { setSupply(rewardbalance) }}
                            >
                                MAX
                            </Box>
                        </InputAdornment>
                    }
                    onKeyPress={(event: any) => {
                        if ((event?.key === '-' || event?.key === '+')) {
                            event.preventDefault();
                        }
                    }}
                    onChange={(event: any) => {
                        if (event.target.value < 0 || event.target.value > rewardbalance)
                            return;
                        setSupply(event.target.value / 1);
                    }} />
            </Box>
            <Box>
                <Box color={"Tomato"} fontSize={'20px'}>
                    Deposit Fee
                </Box>
                <CustomInput
                    className="amountinput"
                    placeholder="0x..."
                    value={depositFee}
                    onChange={(e: any) => setDepositFee(e.target.value)} />
            </Box>
            <Box>
                <Box color={"Tomato"} fontSize={'20px'}>
                    Withdraw Fee
                </Box>
                <CustomInput
                    className="amountinput"
                    placeholder="0x..."
                    value={withdrawFee}
                    onChange={(e: any) => setWithdrawFee(e.target.value)} />
            </Box>
            {stakingtype !== 'Lock' ?
                <Box mt={'15px'} display={'flex'}>
                    <input type='checkbox' style={{ width: '30px', height: '30px' }} checked={hasdividend} onChange={(e) => setHasdividend(e.target.checked)} />
                    <Box color={"Tomato"} fontSize={'20px'} ml={'20px'}>
                        Has Dividend
                    </Box>
                </Box>
                : ''
            }
            <ButtonGroup>
                <Button
                    type="primary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    onClick={() => setStep(2)}
                >
                    Prev
                </Button>
                <Button
                    type="secondary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    disabled={!isvalidate}
                    onClick={() => isvalidate && setStep(4)}
                >
                    Next
                </Button>
            </ButtonGroup>
        </StyledContainer>
    )
}
export default Step3;

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