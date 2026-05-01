import Redis from "ioredis";

function createRediesConnection() {
  return new Redis({
    host: `localhost`,
    port: 6379,
  });
}

export const publisher = createRediesConnection();

export const subcriber = createRediesConnection();
