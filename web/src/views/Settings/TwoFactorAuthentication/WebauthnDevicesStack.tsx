import React, { Fragment, useEffect, useState } from "react";

import { Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { WebauthnDevice } from "@models/Webauthn";
import WebauthnDeviceItem from "@views/Settings/TwoFactorAuthentication/WebauthnDeviceItem";

interface Props {
    devices: WebauthnDevice[] | undefined;
    handleRefreshState: () => void;
}

export default function WebauthnDevicesStack(props: Props) {
    const { t: translate } = useTranslation("settings");

    return (
        <Fragment>
            {props.devices !== undefined && props.devices.length !== 0 ? (
                <Stack spacing={3}>
                    {props.devices.map((x, idx) => (
                        <WebauthnDeviceItem key={idx} index={idx} device={x} handleEdit={props.handleRefreshState} />
                    ))}
                </Stack>
            ) : (
                <Typography variant={"subtitle2"}>
                    {translate(
                        "No Webauthn Credentials have been registered. If you'd like to register one click add.",
                    )}
                </Typography>
            )}
        </Fragment>
    );
}
