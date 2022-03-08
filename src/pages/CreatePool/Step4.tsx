import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import {
    Box, OutlinedInput
} from "@material-ui/core";
import Button from '../../components/Button'
import Dropzone from 'react-dropzone';
import { create } from 'ipfs-http-client';

interface Props {
    setStep: any;
    poolimage: any;
    setPoolImage: any;
    tokensite: any;
    setTokenSite: any;
}
const client = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })

const Step4: React.FC<Props> = ({ setStep, poolimage, setPoolImage, tokensite, setTokenSite }) => {
    const [isvalidate, setIsValidate] = useState(false);
    useEffect(() => {
        if (poolimage.length && tokensite.length)
            setIsValidate(true);
        else setIsValidate(false);
    }, [poolimage, tokensite])
    const getFileBuffer = async (file: any) => {
        return new Promise((res, rej) => {
            // create file reader
            let reader = new FileReader();

            // register event listeners
            reader.addEventListener('loadend', (e: any) => res(e.target.result));
            reader.addEventListener('error', rej);

            // read file
            reader.readAsArrayBuffer(file);
        });
    };
    const dropHandler = async (file: any) => {

        try {
            const buffer: any = await getFileBuffer(file[0]);
            let added = await client.add(buffer)
            const fileUrl = `https://ipfs.infura.io/ipfs/${added.path}`;
            setPoolImage(fileUrl);
            console.log(fileUrl);
        }
        catch (error) {
            console.log(error);
        }
    }
    return (
        <StyledContainer>
            <Box>
                <Box color={"Tomato"} fontSize={'20px'} textAlign={'center'} mb={'30px'}>
                    Upload pool image
                </Box>
                <Dropzone
                    maxFiles={1}
                    accept={[
                        'image/png',
                        'image/jpeg',
                        'image/gif',
                        'video/mp4',
                        'video/quicktime',
                        'audio/mpeg',
                        'audio/wav',
                        'audio/mp3',
                    ]}
                    onDrop={(acceptedFiles: any) => dropHandler(acceptedFiles)}>
                    {({ getRootProps, getInputProps }) => (
                        <Box {...getRootProps()} width={'100%'} mx={'auto'}>
                            <Box bgcolor={'transparent'} border={'1px dashed #ffffff'} boxSizing={'border-box'} borderRadius={'10px'} height={'330px'} display={'flex'} flexDirection={'column'} alignItems={'center'} >
                                <input {...getInputProps()} />
                                {poolimage ? <img src={poolimage} width='330px' height='330px' alt={poolimage} /> :
                                    <>
                                        <Box fontSize='20px' color='white' fontWeight={600} mt='48px'>
                                            JPG, PNG, GIF, SVG, WEBM, MP3, MP4. Max 100mb.
                                        </Box>

                                        <img src="/images/upload.png" alt="uploadicon" style={{ marginTop: '28px' }} />
                                        <Box fontSize='12px' color='white' fontWeight={600} mt='28px'>Drag and Drop File </Box>
                                        <Box fontSize='12px' color='white' mt='4px' >
                                            or
                                            <span style={{ fontWeight: 600, marginLeft: '4px' }}>browse media on your device</span>
                                        </Box>
                                    </>
                                }
                            </Box>
                        </Box>
                    )}
                </Dropzone>
            </Box>
            <Box mt={'30px'}>
                <Box color={"Tomato"} fontSize={'20px'}>
                    Add token website
                </Box>
                <CustomInput
                    className="amountinput"
                    placeholder="0x..."
                    value={tokensite}
                    onChange={(e: any) => setTokenSite(e.target.value)} />
            </Box>
            <ButtonGroup>
                <Button
                    type="primary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    onClick={() => setStep(3)}
                >
                    Prev
                </Button>
                <Button
                    type="secondary"
                    width={"100px"}
                    height={"40px"}
                    fontSize={"16px"}
                    disabled={!isvalidate}
                    onClick={() => isvalidate && setStep(5)}
                >
                    Next
                </Button>
            </ButtonGroup>
        </StyledContainer>
    )
}
export default Step4;

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