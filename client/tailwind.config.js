/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#ff4757", // Red loto
                secondary: "#2f3542",
                accent: "#7bed9f"
            }
        },
    },
    plugins: [],
}
