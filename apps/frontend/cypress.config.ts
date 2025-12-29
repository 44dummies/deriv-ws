import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5173',
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        supportFile: false, // Disabling support file for simplicity in this setup
    },
    component: {
        devServer: {
            framework: "react",
            bundler: "vite",
        },
    },
});
