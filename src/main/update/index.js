// HoYo Gacha Center uses a safe semi-automatic module updater instead of the
// original full-package updater. The original updater downloaded and replaced
// the whole Star Rail app bundle, which is unsafe for this merged project.
const updateInfo = {
  status: 'disabled',
  message: 'Original full-package auto update is disabled. Use the semi-automatic module updater.'
}

const getUpdateInfo = () => updateInfo

exports.getUpdateInfo = getUpdateInfo
