import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
    Box
} from "@material-ui/core";
import Button from '../../components/Button'
interface Props {
    setStep: any;
}
const Step1: React.FC<Props> = ({ setStep }) => {
    return (
        <StyledContainer>
            <Box mx={'auto'} fontSize={'48px'} width={'fit-content'} fontWeight={'bold'} mt={'20px'}>
                Welcome to Mining Staking Pool Page
            </Box>
            <Box mx={'auto'} fontSize={'24px'} width={'fit-content'} mt={'50px'}>
                You can create lock or unlock staking pools here...
            </Box>
            <Box mx={'auto'} fontSize={'24px'} width={'fit-content'} mt={'20px'}>
                It can costs 3BNB
            </Box>
            <ButtonGroup>
                <Button
                    type="secondary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    onClick={() => setStep(2)}
                >
                    Next
                </Button>
            </ButtonGroup>
        </StyledContainer>
    )
}
export default Step1;

const StyledContainer = styled(Box)`
    color : white;
`
const ButtonGroup = styled(Box)`
    margin : 0 auto;
    margin-top : 30px;  
    display : flex;
    width : fit-content;
`