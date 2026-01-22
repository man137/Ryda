import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Driver from "../../../../models/Driver";

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        accountType: { label: "Account Type", type: "text" },
      },
      async authorize(credentials) {
        await dbConnect();

        const { email, password } = credentials;

        // First check if it's a driver account
        let user = await Driver.findOne({ email: email.toLowerCase().trim() })
          .select("+password")
          .lean();

        let accountType = "driver";

        if (!user) {
          // If not a driver, check regular users
          user = await User.findOne({ email: email.toLowerCase().trim() })
            .select("+password")
            .lean();
          accountType = "user";
        }

        if (!user) throw new Error("No account found with this email");

        if (accountType === "driver" && user.approvalStatus === "rejected") {
          throw new Error("Your driver account has been rejected");
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error("Invalid password");

        // Use the accountType from the database, not from credentials
        const actualAccountType = user.accountType || accountType;

        const userData = {
          id: user._id.toString(),
          name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email,
          image: user.profilePic || null,
          accountType: actualAccountType,
        };

        if (actualAccountType === "driver") {
          userData.driverLicense = user.driverLicense;
          userData.vehicleModel = user.vehicleModel;
          userData.licensePlate = user.licensePlate;
        }

        return userData;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.accountType = user.accountType || "user";
        if (user.accountType === "driver") {
          token.driverLicense = user.driverLicense;
          token.vehicleModel = user.vehicleModel;
          token.licensePlate = user.licensePlate;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.image;
        session.user.accountType = token.accountType || "user";
        if (token.accountType === "driver") {
          session.user.driverLicense = token.driverLicense;
          session.user.vehicleModel = token.vehicleModel;
          session.user.licensePlate = token.licensePlate;
        }
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const { handlers } = NextAuth(authOptions);

export const { GET, POST } = handlers;
