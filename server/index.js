import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

const app = express();

app.use(cors());
app.use(express.json());

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Token required",
    });
  }

  try {
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User does not exist",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        message: "User is blocked",
      });
    }

    req.userId = user.id;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "API working",
  });
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      userId: user.id,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        message: "User is blocked",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLogin: new Date(),
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        lastLogin: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    return res.json(users);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/users/block", authMiddleware, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: "User ids are required",
      });
    }

    const result = await prisma.user.updateMany({
      where: {
        id: {
          in: userIds,
        },
      },
      data: {
        status: "blocked",
      },
    });

    return res.json({
      message: "Users blocked",
      count: result.count,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/users/unblock", authMiddleware, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: "User ids are required",
      });
    }

    const result = await prisma.user.updateMany({
      where: {
        id: {
          in: userIds,
        },
      },
      data: {
        status: "unverified",
      },
    });

    return res.json({
      message: "Users unblocked",
      count: result.count,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.delete("/users", authMiddleware, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: "User ids are required",
      });
    }

    const result = await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    return res.json({
      message: "Users deleted",
      count: result.count,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.delete("/users/unverified", authMiddleware, async (req, res) => {
  try {
    const result = await prisma.user.deleteMany({
      where: {
        status: "unverified",
      },
    });

    return res.json({
      message: "Unverified users deleted",
      count: result.count,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
