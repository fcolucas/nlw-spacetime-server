import { randomUUID } from "node:crypto";
import { extname, resolve } from "node:path";
import { FastifyInstance } from "fastify";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

const pump = promisify(pipeline);

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/upload", async (request, reply) => {
    const upload = await request.file({
      limits: {
        fileSize: 1024 * 1024 * 5, // 5MB,
      },
    });

    if (!upload) {
      return reply.status(400).send({
        message: "No file provided",
      });
    }

    // regex to compare if the mimetype is video or image
    const mimeTypeRegex = /^(image|video)\/[a-zA-z]*/;

    const isValidFileFormat = mimeTypeRegex.test(upload.mimetype);

    if (!isValidFileFormat) {
      return reply.status(400).send({
        message: "Invalid file format",
      });
    }

    const fileId = randomUUID();
    const extension = extname(upload.filename);

    const fileName = `${fileId}${extension}`;

    const writeStream = createWriteStream(
      resolve(__dirname, "../../uploads/", fileName)
    );

    await pump(upload.file, writeStream);

    const fullUrl = `${request.protocol}://${request.hostname}`;
    const fileUrl = new URL(`/uploads/${fileName}`, fullUrl).toString();

    return {
      fileUrl,
    };
  });
}
