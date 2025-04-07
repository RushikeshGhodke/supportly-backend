import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { Organization } from "../models/organization.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import sendEmail from "../utils/emailService.js";

// Generate a unique, readable invite code
const generateInviteCode = () => {
    // Create a random base for the code
    const randomBytes = crypto.randomBytes(4);
    // Convert to a readable string (alphanumeric, uppercase)
    const base = randomBytes.toString('hex').toUpperCase();
    // Format with dashes for readability: XXXX-XXXX
    return `${base.substring(0, 4)}-${base.substring(4, 8)}`;
};

const registerOrganization = asyncHandler(async (req, res) => {
    console.log(req.body);
    const { businessname, email, industrytype, selectedPlan } = req.body;

    if ([businessname, email, industrytype].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const otp = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit OTP
    const otpexpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    const inviteToken = uuidv4(); // Use UUID for invite token (could be any unique identifier)

    console.log(businessname, email, industrytype);
    console.log("Generated OTP:", otp);

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    const existingOrganization = await Organization.findOne({ email });
    if (existingOrganization) {
        throw new ApiError(409, "Organization already exists");
    }

    // Send OTP email to the user
    await sendEmail(email, otp);

    // Create a new organization with the provided data
    const newOrganization = await Organization.create({
        businessname,
        email: user.email,
        password: user.password,
        industrytype,
        plan: selectedPlan,
        otp,
        otpexpiry,
        inviteToken,
    });

    user.organizationId = newOrganization._id;  // Link user with the newly created organization
    await user.save();

    res.status(201).json(new ApiResponse(201, { newOrganization }, "Organization registered and linked to user"));
});

const otpverification = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // Check if the required fields are provided
    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    // Find the organization by email
    const existingOrganization = await Organization.findOne({ email });
    if (!existingOrganization) {
        throw new ApiError(404, "Organization not found");
    }

    // Check if OTP is valid
    if (existingOrganization.otp !== otp) {
        throw new ApiError(400, "Invalid OTP");
    }

    // Check if OTP is expired
    const currentTime = new Date();
    if (currentTime > existingOrganization.otpexpiry) {
        throw new ApiError(400, "OTP has expired");
    }

    // Clear OTP and expiry
    existingOrganization.otp = null;
    existingOrganization.otpexpiry = null;
    existingOrganization.isverified = true;


    await existingOrganization.save();

    // Send a success response
    res.status(200).json({ message: "OTP verified successfully" });
});

const getOrganizationInfo = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get the user with their organization ID
    const user = await User.findById(userId);

    if (!user || !user.organizationId) {
        throw new ApiError(404, "User doesn't belong to any organization");
    }

    // Find the organization
    const organization = await Organization.findById(user.organizationId);

    if (!organization) {
        throw new ApiError(404, "Organization not found");
    }

    // Return organization details
    res.status(200).json(
        new ApiResponse(200, { organization }, "Organization information retrieved successfully")
    );
});

const inviteTeamMember = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { emails, role } = req.body;

    if (!organizationId || !emails || !emails.length) {
        throw new ApiError(400, "Organization ID and at least one email are required");
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
        throw new ApiError(404, "Organization not found");
    }

    // Get the current user to verify they belong to this organization
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user || user.organizationId.toString() !== organizationId) {
        throw new ApiError(403, "You don't have permission to invite members to this organization");
    }

    const inviteCode = organization.inviteCode;
    const orgName = organization.businessname;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const results = [];

    // Process each email
    for (const email of emails) {
        // Create unique invite link with token
        const inviteToken = uuidv4();
        const inviteLink = `${baseUrl}/join?token=${inviteToken}&org=${organizationId}&role=${role}`;

        // Store the invitation in the organization
        organization.pendingInvitations = organization.pendingInvitations || [];
        organization.pendingInvitations.push({
            email,
            role,
            token: inviteToken,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        // Send invitation email
        try {
            // If you have an email service set up
            await sendEmail(
                email,
                'teamInvite',
                {
                    orgName,
                    inviteCode,
                    inviteLink
                }
            );
            results.push({ email, sent: true });
        } catch (error) {
            console.error(`Failed to send invitation to ${email}:`, error);
            results.push({ email, sent: false, error: error.message });
        }
    }

    await organization.save();

    res.status(200).json(
        new ApiResponse(200, { results }, "Invitations processed")
    );
});

// Add the missing joinOrganization function if it doesn't exist
const joinOrganization = asyncHandler(async (req, res) => {
    const { inviteToken, inviteCode, organizationId } = req.body;
    const userId = req.user._id;

    let organization;

    // User is trying to join via invite token
    if (inviteToken && organizationId) {
        organization = await Organization.findById(organizationId);
        if (!organization) {
            throw new ApiError(404, "Organization not found");
        }

        // Find the invitation with this token
        const inviteIndex = organization.pendingInvitations.findIndex(
            invite => invite.token === inviteToken && new Date() < invite.expires
        );

        if (inviteIndex === -1) {
            throw new ApiError(400, "Invalid or expired invitation");
        }

        // Get the role from the invitation
        const role = organization.pendingInvitations[inviteIndex].role;

        // Remove the used invitation
        organization.pendingInvitations.splice(inviteIndex, 1);
        await organization.save();

        // Update user with organization and role
        await User.findByIdAndUpdate(userId, {
            organizationId,
            role
        });

        return res.status(200).json(
            new ApiResponse(200, { organization }, "Joined organization successfully")
        );
    }

    // User is trying to join via invite code
    if (inviteCode) {
        organization = await Organization.findOne({ inviteCode });
        if (!organization) {
            throw new ApiError(404, "Invalid organization code");
        }

        // Update user with organization
        await User.findByIdAndUpdate(userId, {
            organizationId: organization._id,
            role: "Member" // Default role when joining with code
        });

        return res.status(200).json(
            new ApiResponse(200, { organization }, "Joined organization successfully")
        );
    }

    throw new ApiError(400, "Either invite token or invite code is required");
});

// Add the missing resendOTP function if it doesn't exist
const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const organization = await Organization.findOne({ email });
    if (!organization) {
        throw new ApiError(404, "Organization not found");
    }

    // Generate a new OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpexpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Update the organization with new OTP
    organization.otp = otp;
    organization.otpexpiry = otpexpiry;
    await organization.save();

    // Send the new OTP via email
    try {
        await sendEmail(
            email,
            'otp',
            otp
        );

        res.status(200).json(
            new ApiResponse(200, {}, "New OTP sent to your email")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to send OTP email");
    }
});

// Fix your export statement to match your imports
export {
    registerOrganization,
    otpverification, // Fix case mismatch
    getOrganizationInfo,
    inviteTeamMember,
    joinOrganization,  // Add missing export
    resendOTP          // Add missing export
};