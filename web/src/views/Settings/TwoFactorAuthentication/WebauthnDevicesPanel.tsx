import React, { Fragment, Suspense, useState } from "react";

import { Box, Button, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { WebauthnDevice } from "@models/Webauthn";
import LoadingPage from "@views/LoadingPage/LoadingPage";
import WebauthnDeviceRegisterDialog from "@views/Settings/TwoFactorAuthentication/WebauthnDeviceRegisterDialog";
import WebauthnDevicesStack from "@views/Settings/TwoFactorAuthentication/WebauthnDevicesStack";

interface Props {
    devices: WebauthnDevice[] | undefined;
    handleRefreshState: () => void;
}

export default function WebauthnDevicesPanel(props: Props) {
    const { t: translate } = useTranslation("settings");

    const [showRegisterDialog, setShowRegisterDialog] = useState<boolean>(false);

    return (
        <Fragment>
            <WebauthnDeviceRegisterDialog
                open={showRegisterDialog}
                setCancelled={() => {
                    setShowRegisterDialog(false);
                    props.handleRefreshState();
                }}
            />
            <Paper variant="outlined">
                <Box sx={{ p: 3 }}>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="h5">{translate("Webauthn Credentials")}</Typography>
                        </Box>
                        <Box>
                            <Tooltip title={translate("Click to add a Webauthn credential to your account")}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={() => {
                                        setShowRegisterDialog(true);
                                    }}
                                >
                                    {translate("Add")}
                                </Button>
                            </Tooltip>
                        </Box>
                        <Suspense fallback={<LoadingPage />}>
                            <WebauthnDevicesStack
                                devices={props.devices}
                                handleRefreshState={props.handleRefreshState}
                            />
                        </Suspense>
                    </Stack>
                </Box>
            </Paper>
        </Fragment>
    );
}
