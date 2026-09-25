import { syncScheduledOrder } from "../../lib/normalized-store";

interface Env {
    DB: D1Database;
}

export default {
    async scheduled(controller: ScheduledController, env: Env) {
        // Use the scheduled timestamp so retries retain the intended Japanese week.
        await syncScheduledOrder(env.DB, new Date(controller.scheduledTime));
    },
} satisfies ExportedHandler<Env>;
