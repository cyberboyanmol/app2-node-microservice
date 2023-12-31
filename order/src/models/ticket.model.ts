import mongoose from "mongoose";
import { Orders, OrderStatus } from "./order.model";
export interface TicketAttrs {
  title: string;
  price: number;
  id: string;
}

interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
  findByEvent(event: {
    id: string;
    version: number;
  }): Promise<TicketDoc | null>;
}

export interface TicketDoc extends mongoose.Document {
  title: string;
  price: number;
  version: number;
  isReserved(): Promise<boolean>;
  //   createdAt: string;
  //   updatedAt: string;
}

const TicketSchema = new mongoose.Schema<TicketAttrs>(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

TicketSchema.set("versionKey", "version");

TicketSchema.pre("save", function (done) {
  this.$where = {
    version: this.get("version") - 1,
  };
  done();
});

TicketSchema.statics.findByEvent = (event: { id: string; version: number }) => {
  return Ticket.findOne({
    _id: event.id,
    version: event.version - 1,
  });
};
TicketSchema.statics.build = (attrs: TicketAttrs) => {
  return new Ticket({
    _id: attrs.id,
    title: attrs.title,
    price: attrs.price,
  });
};

TicketSchema.methods.isReserved = async function () {
  // run query and find an order where the ticket is the ticket we just fetched in ticket db and order status is not cancelled
  //   if we found the order from that means the ticket is already reserved
  const isReserved = await Orders.findOne({
    ticket: this,
    status: {
      $in: [
        OrderStatus.Created,
        OrderStatus.AwaitingPayment,
        OrderStatus.Completed,
      ],
    },
  });

  return !!isReserved;
};

const Ticket = mongoose.model<TicketDoc, TicketModel>("Ticket", TicketSchema);

export { Ticket };
