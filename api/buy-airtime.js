module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed"
        });
    }

    try {
        const { network, phone_number, amount } = req.body || {};

        // Check required fields
        if (!network || !phone_number || !amount) {
            return res.status(400).json({
                success: false,
                message: "Network, phone number and amount are required."
            });
        }

        // Validate Nigerian phone number
        if (!/^0[0-9]{10}$/.test(phone_number)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 11-digit Nigerian phone number."
            });
        }

        // Convert amount to number
        const airtimeAmount = Number(amount);

        // Minimum is ₦100
        if (!Number.isFinite(airtimeAmount) || airtimeAmount < 100) {
            return res.status(400).json({
                success: false,
                message: "Minimum airtime amount is ₦100."
            });
        }

        // Allowed networks
        const allowedNetworks = [
            "MTN",
            "GLO",
            "AIRTEL",
            "9MOBILE"
        ];

        if (!allowedNetworks.includes(network)) {
            return res.status(400).json({
                success: false,
                message: "Invalid network selected."
            });
        }

        // Get secret API key from Vercel Environment Variables
        const apiKey = process.env.MELE_API_KEY;

        if (!apiKey) {
            console.error("MELE_API_KEY is missing.");

            return res.status(500).json({
                success: false,
                message: "Payment service is not configured."
            });
        }

        // Unique transaction reference
        const reference =
            "AIR_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 10)
                .toUpperCase();

        // Send purchase request to MELE
        const response = await fetch(
            "https://meledata.ng/api/v1/developer/airtime/purchase",
            {
                method: "POST",

                headers: {
                    "X-API-Key": apiKey,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    network: network,
                    phone_number: phone_number,
                    amount: airtimeAmount,
                    reference: reference
                })
            }
        );

        // Read MELE response
        const text = await response.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch {
            data = {
                status: false,
                message: "Unexpected response from airtime provider."
            };
        }

        console.log("MELE RESPONSE:", data);

        // MELE returned an error
        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message: data.message || "Airtime purchase failed.",
                provider: data
            });
        }

        // MELE response
        return res.status(200).json({
            success: data.status === true,
            message: data.message || "Airtime purchase completed.",
            transaction: data.data || null
        });

    } catch (error) {
        console.error("SERVER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
};
