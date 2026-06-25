// controllers/user.controller.js
const getCurrentUser = async (req, res) => {
    // Get the logged-in user's own profile
    // Uses req.user.id (from auth middleware)
}

const updateProfile = async (req, res) => {
    // Update logged-in user's own profile
    // Users can only update their own data
}

const changePassword = async (req, res) => {
    // Change logged-in user's password
    // Requires current password verification
}

const deleteAccount = async (req, res) => {
    // Delete logged-in user's own account
}

module.exports = {
    getCurrentUser,
    updateProfile,
    changePassword,
    deleteAccount
};