import {useEffect, useState} from "react";
import styled from "styled-components";
import * as anchor from "@project-serum/anchor";
import {LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import {useAnchorWallet} from "@solana/wallet-adapter-react";
import {WalletMultiButton} from "@solana/wallet-adapter-material-ui";
import {GatewayProvider} from '@civic/solana-gateway-react';
import Countdown from "react-countdown";
import {Snackbar, Paper, LinearProgress, Chip} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import {toDate,AlertState,getAtaForMint} from './utils';
import {MintButton} from './MintButton';
import {
    CandyMachine,
    awaitTransactionSignatureConfirmation,
    getCandyMachineState,
    mintOneToken,
    CANDY_MACHINE_PROGRAM,
} from "./candy-machine";

const WalletContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
`;
const NFT = styled(Paper)`
  min-width: 400px;
  padding: 5px 20px 20px 20px;
  flex: 1 1 auto;
`;
const Des = styled(NFT)`
  text-align: left;
  padding-top: 0px;
`;

const Card = styled(Paper)`
  display: inline-block;
  background-color: var(--card-background-lighter-color) !important;
  margin: 5px;
  padding: 24px;
`;

const MintButtonContainer = styled.div`
  button.MuiButton-contained:not(.MuiButton-containedPrimary).Mui-disabled{
    color: #464646;
  }

  button.MuiButton-contained:not(.MuiButton-containedPrimary):hover,
  button.MuiButton-contained:not(.MuiButton-containedPrimary):focus {
    -webkit-animation: pulse 1s;
    animation: pulse 1s;
    box-shadow: 0 0 0 2em rgba(255, 255, 255, 0);
  }

  @-webkit-keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }
`;

const WalletAmount = styled.div`
  color:black;
  width: auto;
  height: 48px;
  padding: 0 5px 0 16px;
  min-width: 48px;
  min-height: auto;
  border-radius: 24px;
  background-color: var(--main-text-color);
  box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
  box-sizing: border-box;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  font-weight: 500;
  line-height: 1.75;
  text-transform: uppercase;
  border: 0;
  margin: 0;
  display: inline-flex;
  outline: 0;
  position: relative;
  align-items: center;
  user-select: none;
  vertical-align: middle;
  justify-content: flex-start;
  gap:10px;

`;

const ConnectButton = styled(WalletMultiButton)`
`;
const Logo = styled.div`
  flex: 0 0 auto;

  img {
    height: 60px;
  }
`;
const Menu = styled.ul`
  list-style: none;
  display: inline-flex;
  flex: 1 0 auto;

  li {
    margin: 0 12px;

    a {
      color: var(--main-text-color);
      list-style-image: none;
      list-style-position: outside;
      list-style-type: none;
      outline: none;
      text-decoration: none;
      text-size-adjust: 100%;
      touch-action: manipulation;
      transition: color 0.3s;
      padding-bottom: 15px;

      img {
        max-height: 26px;
      }
    }

    a:hover, a:active {
      color: rgb(131, 146, 161);
      border-bottom: 4px solid var(--title-text-color);
    }

  }
`;
const Wallet = styled.ul`
  flex: 0 0 auto;
  margin: 0;
  padding:0;
`;
const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 4%;
  margin-left: 4%;
  text-align: center;
  justify-content: center;
`;

const MintContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 20px;
`;

const DesContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap:20px;
`;

const Price = styled(Chip)`
  position: absolute;
  margin: 5px;
  font-weight: bold;
  font-size: 1em !important;
`;

const Image = styled.img`
  height: 400px;
  width: auto;
  border-radius: 20px;
  margin-bottom: 20px;
`;

const BorderLinearProgress = styled(LinearProgress)`
  margin: 20px 0;
  height: 10px !important;
  border-radius: 5px;
`;

const ShimmerTitle = styled.h1`
  margin: 50px auto;
  text-transform: uppercase;
  animation: glow 2s ease-in-out infinite alternate;
  color: var(--main-text-color);
  @keyframes glow {
    from {
      text-shadow: 0 0 20px var(--main-text-color);
    }
    to {
      text-shadow: 0 0 30px var(--title-text-color), 0 0 10px var(--title-text-color);
    }
  }
`;

const GoldTitle = styled.h2`
  color: var(--title-text-color);
`;

const LogoAligner = styled.div`
  display: flex;
  align-items: center;

  img {
    max-height: 35px;
    margin-right: 10px;
  }
`;

export interface HomeProps {
    candyMachineId: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    txTimeout: number;
    rpcHost: string;
}

const Home = (props: HomeProps) => {
    const [balance, setBalance] = useState<number>();
    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
    const [isActive, setIsActive] = useState(false); // true when countdown completes
    const [itemsAvailable, setItemsAvailable] = useState(0);
    const [itemsRedeemed, setItemsRedeemed] = useState(0);
    const [itemsRemaining, setItemsRemaining] = useState(0);
    const [price, setPrice] = useState(0);
    const [whitelistPrice, setWhitelistPrice] = useState(0);
    const [whitelistEnabled, setWhitelistEnabled] = useState(false);
    const [whitelistTokenBalance, setWhitelistTokenBalance] = useState(0);

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    const wallet = useAnchorWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachine>();

    const rpcUrl = props.rpcHost;

    const refreshCandyMachineState = () => {
        (async () => {
            if (!wallet) return;

            const cndy = await getCandyMachineState(
                wallet as anchor.Wallet,
                props.candyMachineId,
                props.connection
            );

            setCandyMachine(cndy);
            setItemsAvailable(cndy.state.itemsAvailable);
            setItemsRemaining(cndy.state.itemsRemaining);
            setItemsRedeemed(cndy.state.itemsRedeemed);
            setPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);

            // fetch whitelist token balance
            if (cndy.state.whitelistMintSettings) {
                setWhitelistEnabled(true);
                if (cndy.state.whitelistMintSettings.discountPrice !== null && cndy.state.whitelistMintSettings.discountPrice !== cndy.state.price) {
                    setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / LAMPORTS_PER_SOL);
                }
                let balance = 0;
                try {
                    const tokenBalance =
                        await props.connection.getTokenAccountBalance(
                            (
                                await getAtaForMint(
                                    cndy.state.whitelistMintSettings.mint,
                                    wallet.publicKey,
                                )
                            )[0],
                        );

                    balance = tokenBalance?.value?.uiAmount || 0;
                } catch (e) {
                    console.error(e);
                    balance = 0;
                }
                setWhitelistTokenBalance(balance);
            } else {
                setWhitelistEnabled(false);
            }
        })();
    };

    const renderCounter = ({days, hours, minutes, seconds}: any) => {
        return (
            <div><Card elevation={1}><h1>{days}</h1><br/>Days</Card><Card elevation={1}><h1>{hours}</h1>
                <br/>Hours</Card><Card elevation={1}><h1>{minutes}</h1><br/>Mins</Card><Card elevation={1}>
                <h1>{seconds}</h1><br/>Secs</Card></div>
        );
    };

    const onMint = async () => {
        try {
            setIsMinting(true);
            document.getElementById('#identity')?.click();
            if (wallet && candyMachine?.program && wallet.publicKey) {
                const mintTxId = (
                    await mintOneToken(candyMachine, wallet.publicKey)
                )[0];

                let status: any = {err: true};
                if (mintTxId) {
                    status = await awaitTransactionSignatureConfirmation(
                        mintTxId,
                        props.txTimeout,
                        props.connection,
                        'singleGossip',
                        true,
                    );
                }

                if (!status?.err) {
                    setAlertState({
                        open: true,
                        message: 'Congratulations! Mint succeeded!',
                        severity: 'success',
                    });
                } else {
                    setAlertState({
                        open: true,
                        message: 'Mint failed! Please try again!',
                        severity: 'error',
                    });
                }
            }
        } catch (error: any) {
            // TODO: blech:
            let message = error.msg || 'Minting failed! Please try again!';
            if (!error.msg) {
                if (!error.message) {
                    message = 'Transaction Timeout! Please try again.';
                } else if (error.message.indexOf('0x138')) {
                } else if (error.message.indexOf('0x137')) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf('0x135')) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            if (wallet) {
                const balance = await props.connection.getBalance(wallet.publicKey);
                setBalance(balance / LAMPORTS_PER_SOL);
            }
            setIsMinting(false);
            refreshCandyMachineState();
        }
    };

    useEffect(() => {
        (async () => {
            if (wallet) {
                const balance = await props.connection.getBalance(wallet.publicKey);
                setBalance(balance / LAMPORTS_PER_SOL);
            }
        })();
    }, [wallet, props.connection]);

    useEffect(refreshCandyMachineState, [
        wallet,
        props.candyMachineId,
        props.connection,
    ]);

    return (
        <main>
            <MainContainer>
                <WalletContainer>
                    <Logo><a href="#" target="_blank" rel="noopener noreferrer"><img alt="" src="tiger-king-logo.png"/></a></Logo>
                    <Menu>
                        <li><a href="#" target="_blank" rel="noopener noreferrer"></a>
                        </li>
                        <li><a href="#" target="_blank"
                               rel="noopener noreferrer"></a></li>
                        <li><a href="#" target="_blank"
                               rel="noopener noreferrer"></a></li>
                    </Menu>
                    <Wallet>
                        {wallet ?
                            <WalletAmount>{(balance || 0).toLocaleString()} SOL<ConnectButton/></WalletAmount> :
                            <ConnectButton>Connect Wallet</ConnectButton>}
                    </Wallet>
                </WalletContainer>
                <ShimmerTitle>{whitelistEnabled ? "PRE-SALE IS LIVE !" : "MINT IS LIVE !"}</ShimmerTitle>
                <br/>


                <MintContainer>
                    <DesContainer>
                        <NFT elevation={3}>
                            <h2>My NFT</h2>
                            <br/>
                            <div><Price label={whitelistEnabled ? (whitelistPrice + " SOL") : (price + " SOL")}/><Image
                                src="tiger-kings.gif"
                                alt="NFT To Mint"/></div>
                          
                            <MintButtonContainer>
                                {!isActive && candyMachine?.state.goLiveDate ? (
                                    <Countdown
                                        date={toDate(candyMachine?.state.goLiveDate)}
                                        onMount={({ completed }) => completed && setIsActive(true)}
                                        onComplete={() => {
                                            setIsActive(true);
                                        }}
                                        renderer={renderCounter}
                                    />) : (
                                    !wallet ? (
                                            <ConnectButton>Connect Wallet</ConnectButton>
                                        ) :
                                        candyMachine?.state.gatekeeper &&
                                        wallet.publicKey &&
                                        wallet.signTransaction ? (
                                            <GatewayProvider
                                                wallet={{
                                                    publicKey:
                                                        wallet.publicKey ||
                                                        new PublicKey(CANDY_MACHINE_PROGRAM),
                                                    //@ts-ignore
                                                    signTransaction: wallet.signTransaction,
                                                }}
                                                // // Replace with following when added
                                                // gatekeeperNetwork={candyMachine.state.gatekeeper_network}
                                                gatekeeperNetwork={
                                                    candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                                                } // This is the ignite (captcha) network
                                                /// Don't need this for mainnet
                                                clusterUrl={rpcUrl}
                                                options={{autoShowModal: false}}
                                            >
                                                <MintButton
                                                    candyMachine={candyMachine}
                                                    isMinting={isMinting}
                                                    isActive={isActive}
                                                    onMint={onMint}
                                                />
                                            </GatewayProvider>
                                        ) : (
                                            <MintButton
                                                candyMachine={candyMachine}
                                                isMinting={isMinting}
                                                isActive={isActive}
                                                onMint={onMint}
                                            />
                                        ))}
                            </MintButtonContainer>
                            <br/>
                            {wallet && isActive && whitelistEnabled &&
                              <h3>MY REMAINING WHITELIST MINT(S) : {whitelistTokenBalance}</h3>}
                        </NFT>
                    </DesContainer>
                    <DesContainer>
                        <Des elevation={2}>
                            <LogoAligner><img src="tiger-king-logo.png" alt=""></img><GoldTitle>LETS PLAY A GAME!!!</GoldTitle></LogoAligner>
                            <p>It has begun the greatest search and rescue MISSION in the HISTORY of SOLANA!!!!!</p>
                            <p>Joe Exotic needs YOUR help.  Carol Baskin has kidnapped Joe and is about to feed him to </p>
                            <p>her tigers.  Find the TRUE TIGER KING and win a PRIZE fit for a KING for your work. Now go out and MINT the king!!</p>
                        </Des>
                        <Des elevation={2}>
                            <LogoAligner><img src="logo.png" alt=""></img><GoldTitle> Save the Tigers!</GoldTitle></LogoAligner>
                            <p>There are more tigers in captivity that there are in the wild.  These majestic animals deserve more. </p>
                            <p>We will be donating 10% of the mint raised and 25% of royalties to worldwildlife to help save the </p>
                            <p>tigers and their wonderful homes.  For over 50 years WWF has been a shield to all endangered species. </p>
                        </Des>
                        <Des elevation={2}>
                            <LogoAligner><img src="logo.png" alt=""></img><GoldTitle>Disclaimer: Pleeease Don't Sue us</GoldTitle></LogoAligner>
                            <p>All characters and event in this game - even those based on real people - are fictional.</p>
                        
                        </Des>
                    </DesContainer>
                </MintContainer>
            </MainContainer>
            <Snackbar
                open={alertState.open}
                autoHideDuration={6000}
                onClose={() => setAlertState({...alertState, open: false})}
            >
                <Alert
                    onClose={() => setAlertState({...alertState, open: false})}
                    severity={alertState.severity}
                >
                    {alertState.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default Home;