import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../libs/prisma";

export async function memoriesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    await request.jwtVerify();
  });

  app.get("/memories", async (request) => {
    const { sub: userId } = request.user;

    const memories = await prisma.memory.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        coverUrl: true,
        content: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return memories.map((memory) => ({
      ...memory,
      content: memory.content.substring(0, 115).concat("..."),
    }));
  });

  app.get("/memories/:id", async (request, reply) => {
    const { sub: userId } = request.user;

    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    const memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      },
    });

    if (!memory.isPublic && memory.userId !== userId) {
      reply.status(403).send({
        message: "You don't have permission to access this memory",
      });
    }

    return memory;
  });

  app.post("/memories", async (request) => {
    const { sub: userId } = request.user;

    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      isPublic: z.coerce.boolean().default(false),
    });

    const { content, coverUrl, isPublic } = bodySchema.parse(request.body);

    const memory = await prisma.memory.create({
      data: {
        content,
        coverUrl,
        isPublic,
        userId,
      },
    });

    return memory;
  });

  app.put("/memories/:id", async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      isPublic: z.coerce.boolean().default(false),
    });

    const { content, coverUrl, isPublic } = bodySchema.parse(request.body);

    let memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      },
    });

    if (memory.userId !== request.user.sub) {
      return reply.send(403).send({
        message: "You don't have permission to update this memory",
      });
    }

    memory = await prisma.memory.update({
      where: {
        id,
      },
      data: {
        content,
        coverUrl,
        isPublic,
      },
    });

    return memory;
  });

  app.delete("/memories/:id", async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    const memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      },
    });

    if (memory.userId !== request.user.sub) {
      return reply.send(403).send({
        message: "You don't have permission to delete this memory",
      });
    }

    await prisma.memory.delete({
      where: {
        id,
      },
    });

    return {
      message: "Memory deleted",
    };
  });
}
