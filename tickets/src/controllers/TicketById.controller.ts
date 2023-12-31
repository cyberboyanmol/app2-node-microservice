import { NextFunction, Request, Response } from "express";
import { Tickets } from "../models/tickets.model";
import {
  BadRequestError,
  CustomError,
  NotFoundError,
  UnauthorizedError,
} from "@robinanmol/common";
import { TicketUpdatedPublisher } from "../events/publisher/ticket-updated-publisher";
import { natsClient } from "../nats-client";

async function getTicketById(req: Request, res: Response, next: NextFunction) {
  const { ticketId } = req.params;
  try {
    const ticket = await Tickets.findOne({
      _id: ticketId,
    });
    if (!ticket) {
      throw new NotFoundError();
    }
    // console.log(ticket);
    res.status(200).json(ticket);
  } catch (error) {
    next(error);
  }
}

async function updateTicketById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { ticketId } = req.params;
  const { title, price } = req.body;
  try {
    const isTicketExit = await Tickets.findOne({ _id: ticketId });
    if (!isTicketExit) {
      throw new NotFoundError();
    }

    if (isTicketExit.orderId) {
      throw new BadRequestError("ticket is reserved.");
    }

    if (isTicketExit.userId !== req.user?.id) {
      throw new UnauthorizedError();
    }

    // if found update  the ticket
    const updateTicket = await Tickets.findOneAndUpdate(
      { _id: ticketId, userId: req.user?.id },
      {
        $set: {
          title,
          price,
        },
        $inc: {
          version: 1,
        },
      },
      {
        new: true,
        returnDocument: "after",
      }
    );

    const publisher = new TicketUpdatedPublisher(natsClient.client);
    // event publish
    await publisher.publish({
      id: updateTicket!.id,
      title: updateTicket!.title,
      price: updateTicket!.price,
      userId: updateTicket!.userId,
      version: updateTicket!.version,
    });

    res.status(200).json(updateTicket);
  } catch (error) {
    next(error);
  }
}

async function deleteTicketById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { ticketId } = req.params;
  try {
    const isTicketExit = await Tickets.findOne({ _id: ticketId });
    if (!isTicketExit) {
      throw new NotFoundError();
    }

    if (isTicketExit.orderId) {
      throw new BadRequestError("ticket is reserved.");
    }

    if (isTicketExit.userId !== req.user?.id) {
      throw new UnauthorizedError();
    }

    const deleteTicket = await Tickets.findOneAndDelete({ _id: ticketId });
    console.log(deleteTicket);
    res.status(204).json();
  } catch (error) {
    next(error);
  }
}

export const TicketByIdController = {
  getTicketById,
  updateTicketById,
  deleteTicketById,
};
