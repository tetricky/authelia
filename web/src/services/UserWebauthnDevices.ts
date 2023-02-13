import { WebauthnDevice } from "@models/Webauthn";
import { WebauthnDevicesPath } from "@services/Api";
import { GetWithOptionalData } from "@services/Client";

export async function getUserWebauthnDevices(): Promise<WebauthnDevice[]> {
    const res = await GetWithOptionalData<WebauthnDevice[] | null>(WebauthnDevicesPath);

    if (res === null) {
        return [];
    }

    return res;
}
