import analyticsService from '../services/analytics.service.js';

export const getAnalytics = async (req, res) => {
  try {
    const user = req.user;
    const data = await analyticsService.getAnalytics(user);
    res.json(data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      error: error.message || 'Failed to fetch analytics',
    });
  }
};

export const getTenderPerformance = async (req, res) => {
  try {
    const user = req.user;
    const data = await analyticsService.getTenderPerformance(user);
    res.json({ data });
  } catch (error) {
    console.error('Error fetching tender performance:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      error: error.message || 'Failed to fetch tender performance',
    });
  }
};

export const getBidTimeline = async (req, res) => {
  try {
    const user = req.user;
    const data = await analyticsService.getBidTimeline(user);
    res.json({ data });
  } catch (error) {
    console.error('Error fetching bid timeline:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      error: error.message || 'Failed to fetch bid timeline',
    });
  }
};

export const getEvaluationSummary = async (req, res) => {
  try {
    const user = req.user;
    const data = await analyticsService.getEvaluationSummary(user);
    res.json(data);
  } catch (error) {
    console.error('Error fetching evaluation summary:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      error: error.message || 'Failed to fetch evaluation summary',
    });
  }
};
