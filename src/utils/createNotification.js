import { Notification } from "../models/notification.model.js";

export const createNotification = async ({ recipient, actor, type, video }) => {
    if (!recipient || !actor || String(recipient) === String(actor)) return null;

    return Notification.create({
        recipient,
        actor,
        type,
        ...(video ? { video } : {}),
    });
};
