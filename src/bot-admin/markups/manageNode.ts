export const manageNodeMarkup = async () => {
  return {
    message: `Edit your Node details, including the provider percentage and downline ROI percentage.\n\n⚠️Maximum sum of both provider percentage  and downline ROI percentage is <b>0.7</b>, so when setting your provider and downline ROI percentage let it not exceed 0.7 by default they are set as\ndownline %: 0.5\nprovider %: 0.2`,
    keyboard: [
      [
        {
          text: 'Set provider and ROI %',
          callback_data: JSON.stringify({
            command: '/set%',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Reset ROIs to default',
          callback_data: JSON.stringify({
            command: '/resetROI%',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'View Downlines',
          callback_data: JSON.stringify({
            command: '/viewDownlines',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '❌ Close',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
