import axios, { AxiosError } from "axios";
import { authConfig } from "../config/auth";
import { logger } from "../errors/logger";

export class AdjutorService {
    private static readonly BASE_URL = "https://adjutor.lendsqr.com/v2";

    static async checkKarma(identity: string): Promise<{
        isBlacklisted: boolean;
        reason?: string;
        message?: string;
    }> {
        try {
            if (!authConfig.adjutorApiKey) {
                logger.warn("ADJUTOR_API_KEY is not set");
                // Fail open or closed? Requirements say "if their identity cannot be verified... prompted to try again".
                // But if config is missing, it's a server error...
                throw new Error("Adjutor API Key is missing in configuration");
            }

            const response = await axios.get(
                `${this.BASE_URL}/verification/karma/${identity}`,
                {
                    headers: {
                        Authorization: `Bearer ${authConfig.adjutorApiKey}`,
                    },
                }
            );

            // If the request is successful (200 OK), it means the user was found in the blacklist...
            // The API returns details about the karma entry...
            // Response structure: { status: "success", message: "...", data: { ...karma_details... } }
            const responseBody = response.data;
            const karmaData = responseBody.data;

            // Based on the user request description:
            // "If a user is not on the blacklist, registereation should go on smoothly and seemlessly."
            // "If they are present on the application, then a response should be sent indicationg why"

            // Typically, if a user is NOT found, the API might return 404... 
            // If the user IS found, it returns 200 with data...

            const reason = karmaData?.reason || karmaData?.karma_type?.karma || "User is on the blacklist";

            return {
                isBlacklisted: true,
                reason: reason,
                message: responseBody.message
            };

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                if (axiosError.response?.status === 404) {
                    // User not found in blacklist -> Safe to register
                    return { isBlacklisted: false };
                }

                logger.error("Adjutor API Error", {
                    status: axiosError.response?.status,
                    data: axiosError.response?.data,
                    message: axiosError.message
                });
            } else {
                logger.error("Adjutor Service Error", { error });
            }

            // Re-throw to be handled by middleware (which will convert to 503/500)
            throw error;
        }
    }
}
