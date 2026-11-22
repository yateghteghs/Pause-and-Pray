import ExpoModulesCore
import FamilyControls
import SwiftUI

public class AppGateModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppGate")

    Function("setConfig") { (json: String) in
      GateShared.saveConfig(json: json)
      try? GateShared.startMonitoring()
    }

    // iOS tokens are opaque, so unlocking lifts the shield for every chosen app.
    Function("unlock") { (_: String, minutes: Int) in
      try GateShared.unlock(minutes: minutes)
    }

    AsyncFunction("requestAuthorization") { () async -> Bool in
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        return true
      } catch {
        return false
      }
    }

    Function("isAuthorized") {
      AuthorizationCenter.shared.authorizationStatus == .approved
    }

    Function("selectionCount") {
      GateShared.selectionCount()
    }

    /// Skips tapped on the shield itself, to merge into the app's stats.
    Function("drainExtensionEvents") { () -> [[String: Any]] in
      GateShared.drainEvents()
    }

    AsyncFunction("presentAppPicker") { (promise: Promise) in
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("E_NO_VIEW", "No view controller to present the picker from")
        return
      }
      var host: UIViewController?
      let view = AppPickerView(selection: GateShared.loadSelection() ?? FamilyActivitySelection()) { result in
        if let result {
          GateShared.saveSelection(result)
          try? GateShared.startMonitoring()
        }
        host?.dismiss(animated: true)
        promise.resolve(GateShared.selectionCount())
      }
      let controller = UIHostingController(rootView: view)
      host = controller
      presenter.present(controller, animated: true)
    }.runOnQueue(.main)
  }
}

struct AppPickerView: View {
  @State var selection: FamilyActivitySelection
  let onDone: (FamilyActivitySelection?) -> Void

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Apps to pause")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button("Cancel") { onDone(nil) } }
          ToolbarItem(placement: .confirmationAction) { Button("Done") { onDone(selection) } }
        }
    }
  }
}
