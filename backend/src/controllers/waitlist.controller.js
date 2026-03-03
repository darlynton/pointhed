// Waitlist has been moved to a separate project.
// Keep this handler as an explicit deprecation response for any stale clients.
export const joinWaitlist = async (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Waitlist has moved to join.pointhed.com',
  });
};
