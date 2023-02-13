import React, { useEffect, useState } from "react";

import { Grid } from "@mui/material";

import { useNotifications } from "@hooks/NotificationsContext";
import { useUserInfoPOST } from "@hooks/UserInfo";
import { useUserInfoTOTPConfiguration, useUserInfoTOTPConfigurationOptional } from "@hooks/UserInfoTOTPConfiguration";
import { useUserWebauthnDevices } from "@hooks/WebauthnDevices";
import TOTPPanel from "@views/Settings/TwoFactorAuthentication/TOTPPanel";
import WebauthnDevicesPanel from "@views/Settings/TwoFactorAuthentication/WebauthnDevicesPanel";

interface Props {}

export default function TwoFactorAuthSettings(props: Props) {
    const [refreshState, setRefreshState] = useState(0);
    const { createErrorNotification } = useNotifications();
    const [userInfo, fetchUserInfo, , fetchUserInfoError] = useUserInfoPOST();
    const [userTOTPConfig, fetchUserTOTPConfig, , fetchUserTOTPConfigError] = useUserInfoTOTPConfigurationOptional();
    const [userWebAuthnDevices, fetchUserWebAuthnDevices, , fetchUserWebAuthnDevicesError] = useUserWebauthnDevices();
    const [hasTOTP, setHasTOTP] = useState(false);
    const [hasWebAuthn, setHasWebAuthn] = useState(false);

    const handleRefreshState = () => {
        setRefreshState((refreshState) => refreshState + 1);
    };

    useEffect(() => {
        fetchUserInfo();
    }, [fetchUserInfo, refreshState]);

    useEffect(() => {
        if (userInfo === undefined) {
            return;
        }

        if (userInfo.has_webauthn !== hasWebAuthn) {
            setHasWebAuthn(userInfo.has_webauthn);
        }

        if (userInfo.has_totp !== hasTOTP) {
            setHasTOTP(userInfo.has_totp);
        }
    }, [userInfo]);

    useEffect(() => {
        fetchUserTOTPConfig();
    }, [fetchUserTOTPConfig, hasTOTP]);

    useEffect(() => {
        fetchUserWebAuthnDevices();
    }, [fetchUserWebAuthnDevices, hasWebAuthn]);

    useEffect(() => {
        if (fetchUserInfoError) {
            createErrorNotification("There was an issue retrieving user preferences");
        }
    }, [fetchUserInfoError, createErrorNotification]);

    useEffect(() => {
        if (fetchUserTOTPConfigError) {
            createErrorNotification("There was an issue retrieving One Time Password Configuration");
        }
    }, [fetchUserTOTPConfigError, createErrorNotification]);

    useEffect(() => {
        if (fetchUserWebAuthnDevicesError) {
            createErrorNotification("There was an issue retrieving One Time Password Configuration");
        }
    }, [fetchUserWebAuthnDevicesError, createErrorNotification]);

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TOTPPanel config={userTOTPConfig} handleRefreshState={handleRefreshState} />
            </Grid>
            <Grid item xs={12}>
                <WebauthnDevicesPanel devices={userWebAuthnDevices} handleRefreshState={handleRefreshState} />
            </Grid>
        </Grid>
    );
}
