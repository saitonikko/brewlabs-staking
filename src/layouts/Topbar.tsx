import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Box } from "@material-ui/core";
import Web3 from "web3";
import { Link } from "react-router-dom";
import Button from "../components/Button";

declare let window: any;

interface TopbarProps {
    account: string;
    setAccount: any;
}

const Topbar: React.FC<TopbarProps> = ({ account, setAccount }) => {
    let ellipsis = account
        ? account.slice(0, 4) +
        "..." +
        account.substring(account.length - 4, account.length)
        : "Connect Wallet";
    const onConnect = async () => {
        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum);
            try {
                await window.ethereum.enable();
                const accounts = await window.web3.eth.getAccounts();
                setAccount(accounts[0]);
            } catch (error) {
                console.log(error);
            }
        }
    };

    useEffect(() => {
        window.ethereum.on("accountsChanged", function (accounts: any) {
            // Time to reload your interface with accounts[0]!
            onConnect();
        });
        onConnect();
    }, []);

    return (
        <StyledContainer>
            <Menus>

                <Link to={'/'}>
                    <Box>Create Pool</Box>
                </Link>
                <Link to={'/PoolList'}>
                    <Box>Pool List</Box>
                </Link>
            </Menus>

            <Button type="secondary" onClick={() => !account.length && onConnect()}>
                {ellipsis}
            </Button>
        </StyledContainer>
    );
};

const StyledContainer = styled(Box)`
        position: fixed;
        top: 0;
        z-index: 10;
        display: flex;
        justify-content: space-between;
        padding: 20px 40px 20px 100px;
        width: 100%;
        align-items: center;
        `;

const Menus = styled(Box)`
        display: flex;
        justify-content: space-between;
        color: white;
        font-size: 24px;
  >a>div{
      color : white;
          cursor : pointer;
        transition : all 0.4s;
        padding-right : 100px;
        :hover{
          opacity : 0.6;
      }
  }
        `;

export default Topbar;
