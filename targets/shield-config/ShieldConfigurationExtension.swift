import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Draws the "Pause and pray" shield. Apple allows only an icon, a title, a
/// few lines of text and two buttons here; the full prayer opens in the app.
class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  private let green = UIColor(red: 0.12, green: 0.32, blue: 0.21, alpha: 1)

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    make(application.localizedDisplayName)
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    make(application.localizedDisplayName)
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    make(webDomain.domain)
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    make(webDomain.domain)
  }

  private func make(_ name: String?) -> ShieldConfiguration {
    let before = name.map { "Before \($0), " } ?? ""
    return ShieldConfiguration(
      backgroundBlurStyle: .systemThickMaterialDark,
      backgroundColor: green,
      icon: UIImage(systemName: "hands.sparkles.fill"),
      title: ShieldConfiguration.Label(text: "Pause and pray", color: .white),
      subtitle: ShieldConfiguration.Label(
        text: "\(before)say a short prayer.\n\nHail Mary, full of grace, the Lord is with thee…",
        color: .white
      ),
      primaryButtonLabel: ShieldConfiguration.Label(text: "Pray now", color: green),
      primaryButtonBackgroundColor: .white,
      secondaryButtonLabel: ShieldConfiguration.Label(text: "Skip for now", color: .white)
    )
  }
}
