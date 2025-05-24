import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail, generateVerificationToken } from "@/lib/email"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate email verification token
    const verificationToken = generateVerificationToken()
    const verificationExpires = new Date()
    verificationExpires.setHours(verificationExpires.getHours() + 24) // 24 hours from now

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      }
    })

    // Create default categories for the new user
    const defaultCategories = [
      // Income categories
      { name: "Salary", icon: "💼", color: "#10B981", type: "INCOME" as const },
      { name: "Freelance", icon: "💻", color: "#6366F1", type: "INCOME" as const },
      { name: "Investment", icon: "📈", color: "#8B5CF6", type: "INCOME" as const },
      { name: "Other Income", icon: "💰", color: "#F59E0B", type: "INCOME" as const },
      
      // Expense categories
      { name: "Food & Dining", icon: "🍽️", color: "#EF4444", type: "EXPENSE" as const },
      { name: "Transportation", icon: "🚗", color: "#F97316", type: "EXPENSE" as const },
      { name: "Shopping", icon: "🛍️", color: "#EC4899", type: "EXPENSE" as const },
      { name: "Entertainment", icon: "🎬", color: "#8B5CF6", type: "EXPENSE" as const },
      { name: "Bills & Utilities", icon: "📄", color: "#6B7280", type: "EXPENSE" as const },
      { name: "Healthcare", icon: "🏥", color: "#EF4444", type: "EXPENSE" as const },
      { name: "Education", icon: "🎓", color: "#3B82F6", type: "EXPENSE" as const },
      { name: "Travel", icon: "✈️", color: "#06B6D4", type: "EXPENSE" as const },
      { name: "Other Expenses", icon: "💸", color: "#6B7280", type: "EXPENSE" as const },
    ]

    await prisma.category.createMany({
      data: defaultCategories.map(category => ({
        ...category,
        userId: user.id,
        isDefault: true,
      }))
    })

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      // Continue without failing the registration
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { 
        message: "Registration successful! Please check your email to verify your account.", 
        user: userWithoutPassword,
        requiresVerification: true
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
