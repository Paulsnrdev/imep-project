const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

exports.register        = asyncHandler((req, res) => authService.register(req, res));
exports.login           = asyncHandler((req, res) => authService.login(req, res));
exports.logout          = asyncHandler((req, res) => authService.logout(req, res));
exports.refresh         = asyncHandler((req, res) => authService.refresh(req, res));
exports.getMe           = asyncHandler((req, res) => authService.getMe(req, res));
exports.forgotPassword  = asyncHandler((req, res) => authService.forgotPassword(req, res));
exports.resetPassword   = asyncHandler((req, res) => authService.resetPassword(req, res));
