import axios from "axios";
import { describe, it, expect } from "vitest";
import dotenv from "dotenv";

dotenv.config();

describe("Adjutor API Health Check", () => {
    it("should be reachable", async () => {
        // Since we don't have a dedicated health endpoint in the docs, 
        // we'll check the base URL or a known endpoint.
        // The docs say base_url: https://adjutor.lendsqr.com/v2/
        // Let's try to hit the base URL.

        try {
            const response = await axios.get("https://adjutor.lendsqr.com/v2/");
            // We expect some response, even if it's 404 (Not Found) for the root,
            // but we want to ensure we can connect.
            // Actually, usually APIs return 200 or 404 on root.
            // Let's just check if we get a response.
            expect(response.status).toBeDefined();
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response) {
                // If we get a response (even 404 or 401), the API is reachable.
                expect(error.response.status).toBeDefined();
            } else {
                // Network error or other issue
                console.error("Adjutor API unreachable:", error.message);
                throw error;
            }
        }
    });

    it("should have ADJUTOR_API_KEY set", () => {
        expect(process.env.ADJUTOR_API_KEY).toBeDefined();
        expect(process.env.ADJUTOR_API_KEY).not.toBe("");
    });
});
