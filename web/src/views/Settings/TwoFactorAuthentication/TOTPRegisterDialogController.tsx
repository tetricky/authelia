import React, { Fragment, useCallback, useEffect, useState } from "react";

import { IconDefinition, faCopy, faKey, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    IconButton,
    Link,
    Radio,
    RadioGroup,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Theme,
    Typography,
} from "@mui/material";
import { red } from "@mui/material/colors";
import makeStyles from "@mui/styles/makeStyles";
import classnames from "classnames";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

import AppStoreBadges from "@components/AppStoreBadges";
import { GoogleAuthenticator } from "@constants/constants";
import { useNotifications } from "@hooks/NotificationsContext";
import { TOTPOptions, toAlgorithmString } from "@models/TOTPConfiguration";
import { completeTOTPRegister, stopTOTPRegister } from "@services/OneTimePassword";
import { getTOTPSecret } from "@services/RegisterDevice";
import { getTOTPOptions } from "@services/UserInfoTOTPConfiguration";
import { State } from "@views/LoginPortal/SecondFactor/OneTimePasswordMethod";
import OTPDial from "@views/LoginPortal/SecondFactor/OTPDial";

const steps = ["Start", "Scan QR Code", "Confirmation"];

interface Props {
    open: boolean;
    setClosed: () => void;
}

export default function TOTPRegisterDialogController(props: Props) {
    const { t: translate } = useTranslation("settings");

    const styles = useStyles();
    const { createErrorNotification, createSuccessNotification } = useNotifications();

    const [activeStep, setActiveStep] = useState(0);
    const [options, setOptions] = useState<TOTPOptions | null>(null);
    const [optionAlgorithm, setOptionAlgorithm] = useState("");
    const [optionLength, setOptionLength] = useState(6);
    const [optionPeriod, setOptionPeriod] = useState(30);
    const [optionAlgorithms, setOptionAlgorithms] = useState<string[]>([]);
    const [optionLengths, setOptionLengths] = useState<string[]>([]);
    const [optionPeriods, setOptionPeriods] = useState<string[]>([]);
    const [totpSecretURL, setTOTPSecretURL] = useState("");
    const [totpSecretBase32, setTOTPSecretBase32] = useState<string | undefined>(undefined);
    const [totpIsLoading, setTOTPIsLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [hasErrored, setHasErrored] = useState(false);
    const [dialValue, setDialValue] = useState("");
    const [dialState, setDialState] = useState(State.Idle);

    const resetStates = () => {
        setOptions(null);
        setOptionAlgorithm("");
        setOptionLength(6);
        setOptionPeriod(30);
        setOptionAlgorithms([]);
        setOptionLengths([]);
        setOptionPeriods([]);
        setTOTPSecretURL("");
        setTOTPSecretBase32(undefined);
        setTOTPIsLoading(false);
        setShowAdvanced(false);
        setActiveStep(0);
        setDialValue("");
        setDialState(State.Idle);
    };

    const handleClose = useCallback(() => {
        (async () => {
            props.setClosed();

            if (totpSecretURL !== "") {
                try {
                    await stopTOTPRegister();
                } catch (err) {
                    console.error(err);
                }
            }

            resetStates();
        })();
    }, [totpSecretURL, props]);

    const handleOnClose = () => {
        if (!props.open) {
            return;
        }

        handleClose();
    };

    useEffect(() => {
        if (!props.open || activeStep !== 0) {
            return;
        }

        (async () => {
            const opts = await getTOTPOptions();
            setOptions(opts);
            setOptionAlgorithm(toAlgorithmString(opts.algorithm));
            setOptionAlgorithms(opts.algorithms.map((algorithm) => toAlgorithmString(algorithm)));
            setOptionLength(opts.length);
            setOptionLengths(opts.lengths.map((length) => length.toString()));
            setOptionPeriod(opts.period);
            setOptionPeriods(opts.periods.map((period) => period.toString()));
        })();
    }, [props.open, activeStep]);

    const handleSetStepPrevious = useCallback(() => {
        if (activeStep === 0) {
            return;
        }

        setActiveStep((prevState) => (prevState -= 1));
    }, [activeStep]);

    const handleSetStepNext = useCallback(() => {
        if (activeStep === steps.length - 1) {
            return;
        }

        setActiveStep((prevState) => (prevState += 1));
    }, [activeStep]);

    useEffect(() => {
        if (!props.open || activeStep !== 1) {
            return;
        }

        (async () => {
            setTOTPIsLoading(true);

            try {
                const secret = await getTOTPSecret(optionAlgorithm, optionLength, optionPeriod);
                setTOTPSecretURL(secret.otpauth_url);
                setTOTPSecretBase32(secret.base32_secret);
            } catch (err) {
                console.error(err);
                if ((err as Error).message.includes("Request failed with status code 403")) {
                    createErrorNotification(
                        translate(
                            "You must open the link from the same device and browser that initiated the registration process",
                        ),
                    );
                } else {
                    createErrorNotification(
                        translate("Failed to register device, the provided link is expired or has already been used"),
                    );
                }
                setHasErrored(true);
            }

            setTOTPIsLoading(false);
        })();
    }, [activeStep, createErrorNotification, optionAlgorithm, optionLength, optionPeriod, props.open, translate]);

    useEffect(() => {
        if (!props.open || activeStep !== 2 || dialValue.length !== optionLength) {
            return;
        }

        (async () => {
            setDialState(State.InProgress);

            try {
                await completeTOTPRegister(dialValue);
                setDialState(State.Success);
            } catch (err) {
                console.error(err);
                setDialState(State.Failure);
            }
        })();
    }, [activeStep, dialValue, dialValue.length, optionLength, props.open]);

    const toggleAdvanced = () => {
        setShowAdvanced((prevState) => !prevState);
    };

    const advanced =
        options !== null &&
        (optionAlgorithms.length !== 1 || optionAlgorithms.length !== 1 || optionPeriods.length !== 1);

    const hideAdvanced =
        options === null || (optionAlgorithms.length <= 1 && optionPeriods.length <= 1 && optionLengths.length <= 1);

    const hideAlgorithms = advanced && optionAlgorithms.length <= 1;
    const hideLengths = advanced && optionLengths.length <= 1;
    const hidePeriods = advanced && optionPeriods.length <= 1;
    const qrcodeFuzzyStyle = totpIsLoading || hasErrored ? styles.fuzzy : undefined;

    function SecretButton(text: string | undefined, action: string, icon: IconDefinition) {
        return (
            <IconButton
                className={styles.secretButtons}
                color="primary"
                onClick={() => {
                    navigator.clipboard.writeText(`${text}`);
                    createSuccessNotification(`${action}`);
                }}
                size="large"
            >
                <FontAwesomeIcon icon={icon} />
            </IconButton>
        );
    }

    function renderStep(step: number) {
        switch (step) {
            case 0:
                return (
                    <Fragment>
                        {options === null ? (
                            <Grid item xs={12}>
                                <Typography>Loading...</Typography>
                            </Grid>
                        ) : (
                            <Fragment>
                                <Grid item xs={12}>
                                    <Typography>{translate("To begin select next")}</Typography>
                                </Grid>
                                <Grid item xs={12} hidden={hideAdvanced}>
                                    <Button variant={"outlined"} color={"warning"} onClick={toggleAdvanced}>
                                        {showAdvanced ? translate("Hide Advanced") : translate("Show Advanced")}
                                    </Button>
                                </Grid>
                                <Grid
                                    item
                                    xs={12}
                                    hidden={hideAdvanced || !showAdvanced}
                                    justifyContent={"center"}
                                    alignItems={"center"}
                                >
                                    <FormControl fullWidth>
                                        <FormLabel id={"lbl-adv-algorithms"} hidden={hideAlgorithms}>
                                            {translate("Algorithm")}
                                        </FormLabel>
                                        <RadioGroup
                                            row
                                            aria-labelledby={"lbl-adv-algorithms"}
                                            value={optionAlgorithm}
                                            hidden={hideAlgorithms}
                                            style={{
                                                justifyContent: "center",
                                            }}
                                            onChange={(e, value) => {
                                                setOptionAlgorithm(value);
                                                e.preventDefault();
                                            }}
                                        >
                                            {optionAlgorithms.map((algorithm) => (
                                                <FormControlLabel
                                                    key={algorithm}
                                                    value={algorithm}
                                                    control={<Radio />}
                                                    label={algorithm}
                                                />
                                            ))}
                                        </RadioGroup>
                                        <FormLabel id={"lbl-adv-lengths"} hidden={hideLengths}>
                                            {translate("Length")}
                                        </FormLabel>
                                        <RadioGroup
                                            row
                                            aria-labelledby={"lbl-adv-lengths"}
                                            value={optionLength.toString()}
                                            hidden={hideLengths}
                                            style={{
                                                justifyContent: "center",
                                            }}
                                            onChange={(e, value) => {
                                                setOptionLength(parseInt(value));
                                                e.preventDefault();
                                            }}
                                        >
                                            {optionLengths.map((length) => (
                                                <FormControlLabel
                                                    key={length}
                                                    value={length}
                                                    control={<Radio />}
                                                    label={length}
                                                />
                                            ))}
                                        </RadioGroup>
                                        <FormLabel id={"lbl-adv-periods"} hidden={hidePeriods}>
                                            {translate("Seconds")}
                                        </FormLabel>
                                        <RadioGroup
                                            row
                                            aria-labelledby={"lbl-adv-periods"}
                                            value={optionPeriod.toString()}
                                            hidden={hidePeriods}
                                            style={{
                                                justifyContent: "center",
                                            }}
                                            onChange={(e, value) => {
                                                setOptionPeriod(parseInt(value));
                                                e.preventDefault();
                                            }}
                                        >
                                            {optionPeriods.map((period) => (
                                                <FormControlLabel
                                                    key={period}
                                                    value={period}
                                                    control={<Radio />}
                                                    label={period}
                                                />
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                </Grid>
                            </Fragment>
                        )}
                    </Fragment>
                );
            case 1:
                return (
                    <Fragment>
                        <Grid item xs={12}>
                            <Box className={styles.googleAuthenticator}>
                                <Typography className={styles.googleAuthenticatorText}>
                                    {translate("Need Google Authenticator?")}
                                </Typography>
                                <AppStoreBadges
                                    iconSize={128}
                                    targetBlank
                                    className={styles.googleAuthenticatorBadges}
                                    googlePlayLink={GoogleAuthenticator.googlePlay}
                                    appleStoreLink={GoogleAuthenticator.appleStore}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Box className={classnames(qrcodeFuzzyStyle, styles.qrcodeContainer)}>
                                <Link href={totpSecretURL} underline="hover">
                                    <QRCodeSVG value={totpSecretURL} className={styles.qrcode} size={256} />
                                    {!hasErrored && totpIsLoading ? (
                                        <CircularProgress className={styles.loader} size={128} />
                                    ) : null}
                                    {hasErrored ? (
                                        <FontAwesomeIcon className={styles.failureIcon} icon={faTimesCircle} />
                                    ) : null}
                                </Link>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Grid container spacing={2} justifyContent={"center"}>
                                <Grid item xs={12}>
                                    {totpSecretURL !== "empty" ? (
                                        <TextField
                                            id="secret-url"
                                            label={translate("Secret")}
                                            className={styles.secret}
                                            value={totpSecretURL}
                                            InputProps={{
                                                readOnly: true,
                                            }}
                                        />
                                    ) : null}
                                </Grid>
                                <Grid item xs={2}>
                                    {totpSecretBase32
                                        ? SecretButton(
                                              totpSecretBase32,
                                              translate("OTP Secret copied to clipboard"),
                                              faKey,
                                          )
                                        : null}
                                </Grid>
                                <Grid item xs={2}>
                                    {totpSecretURL !== "empty"
                                        ? SecretButton(totpSecretURL, translate("OTP URL copied to clipboard"), faCopy)
                                        : null}
                                </Grid>
                            </Grid>
                        </Grid>
                    </Fragment>
                );
            case 2:
                return (
                    <Grid item xs={12}>
                        <OTPDial
                            passcode={dialValue}
                            state={dialState}
                            digits={optionLength}
                            period={optionPeriod}
                            onChange={setDialValue}
                        />
                    </Grid>
                );
        }
    }

    return (
        <Dialog open={props.open} onClose={handleOnClose} maxWidth={"xs"} fullWidth={true}>
            <DialogTitle>{translate("Register One Time Password (TOTP)")}</DialogTitle>
            <DialogContent>
                <Grid container spacing={0} alignItems={"center"} justifyContent={"center"} textAlign={"center"}>
                    <Grid item xs={12}>
                        <Stepper activeStep={activeStep}>
                            {steps.map((label, index) => {
                                const stepProps: { completed?: boolean } = {};
                                const labelProps: {
                                    optional?: React.ReactNode;
                                } = {};
                                return (
                                    <Step key={label} {...stepProps}>
                                        <StepLabel {...labelProps}>{translate(label)}</StepLabel>
                                    </Step>
                                );
                            })}
                        </Stepper>
                    </Grid>
                    <Grid item xs={12}>
                        <Grid container spacing={2} paddingY={3} justifyContent={"center"}>
                            {renderStep(activeStep)}
                        </Grid>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button
                    variant={"outlined"}
                    color={"primary"}
                    onClick={handleSetStepPrevious}
                    disabled={activeStep === 0}
                >
                    {translate("Previous")}
                </Button>
                <Button variant={"outlined"} color={"primary"} onClick={handleClose}>
                    {translate("Cancel")}
                </Button>
                <Button
                    variant={"outlined"}
                    color={"primary"}
                    onClick={handleSetStepNext}
                    disabled={activeStep === steps.length - 1}
                >
                    {translate("Next")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
    qrcode: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
        padding: theme.spacing(),
        backgroundColor: "white",
    },
    fuzzy: {
        filter: "blur(10px)",
    },
    secret: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
        width: "256px",
    },
    googleAuthenticator: {},
    googleAuthenticatorText: {
        fontSize: theme.typography.fontSize * 0.8,
    },
    googleAuthenticatorBadges: {},
    secretButtons: {},
    doneButton: {
        width: "256px",
    },
    qrcodeContainer: {
        position: "relative",
        display: "inline-block",
    },
    loader: {
        position: "absolute",
        top: "calc(128px - 64px)",
        left: "calc(128px - 64px)",
        color: "rgba(255, 255, 255, 0.5)",
    },
    failureIcon: {
        position: "absolute",
        top: "calc(128px - 64px)",
        left: "calc(128px - 64px)",
        color: red[400],
        fontSize: "128px",
    },
}));
