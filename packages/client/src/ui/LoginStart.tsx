import { Card, Colors, H5 } from "@blueprintjs/core";
import { AddressIcon, LedgerIcon } from "assets/images";
import { COLORS } from "constants/colors";
import Analytics from "lib/analytics-lib";
import { SIGNIN_TYPE } from "modules/ledger/actions";
import Modules, { ReduxStoreState } from "modules/root";
import { i18nSelector } from "modules/settings/selectors";
import React from "react";
import { connect } from "react-redux";
import styled, { CSSProperties } from "styled-components";
import { capitalizeString, onPath } from "tools/client-utils";
import { composeWithProps } from "tools/context-utils";
import { IThemeProps } from "ui/containers/ThemeContainer";
import { View } from "./SharedComponents";
import Toast from "./Toast";

/** ===========================================================================
 * React Component
 * ============================================================================
 */

class LoginStart extends React.Component<IProps, {}> {
  render(): JSX.Element {
    const enableThemedStyles = !this.onLandingPage();
    const { t } = this.props.i18n;
    const { signinNetworkName } = this.props.ledgerDialog;

    return (
      <View>
        <H5
          style={{
            textAlign: "center",
            color: enableThemedStyles ? undefined : COLORS.DARK_TITLE,
          }}
        >
          {t("Please select a login option to begin")}
        </H5>
        <WrappedRow>
          <Card
            interactive
            data-cy="ledger-signin"
            className="ledger-login-card"
            onClick={this.handleChooseSelectNetwork}
            style={getCardButtonStyles(this.props.settings.isDesktop)}
          >
            <LedgerIcon />
            <LoginText className="login-text">
              {signinNetworkName
                ? `Sign in to ${capitalizeString(signinNetworkName)} Network`
                : this.props.ledger.connected
                ? "Switch Network"
                : t("Sign in with Ledger")}
            </LoginText>
          </Card>
          <Card
            interactive
            data-cy="address-signin"
            className="address-login-card"
            onClick={this.handleSignInWithAddress}
            style={getCardButtonStyles(this.props.settings.isDesktop)}
          >
            <AddressIcon />
            <LoginText className="login-text">
              {this.props.ledger.address
                ? t("Change address")
                : t("Sign in with address")}
            </LoginText>
          </Card>
        </WrappedRow>
        <InfoTextBottom>
          Connect your Ledger Device or search any address to sign in to Anthem.
        </InfoTextBottom>
      </View>
    );
  }

  handleChooseSelectNetwork = () => {
    if (this.props.settings.isDesktop) {
      const { signinNetworkName } = this.props.ledgerDialog;
      // If a signinNetworkName is already selected, skip to the connect step
      // directly
      if (signinNetworkName) {
        this.props.openLedgerDialog({
          signinType: "LEDGER",
          ledgerAccessType: "SIGNIN",
        });
      } else {
        this.props.openSelectNetworkDialog({
          signinType: "LEDGER",
          ledgerAccessType: "SIGNIN",
          ledgerActionType: undefined,
        });
      }
    } else {
      Toast.warn("Ledger integration is only available on desktop.");
    }
  };

  handleSignInWithAddress = () => {
    this.trackLogin("ADDRESS");
    this.props.openLedgerDialog({
      signinType: "ADDRESS",
      ledgerAccessType: "SIGNIN",
    });
  };

  trackLogin = (type: SIGNIN_TYPE) => {
    if (this.onLandingPage()) {
      Analytics.loginStart(type);
    } else {
      Analytics.loginUpdate(type);
    }
  };

  onLandingPage = () => {
    return onPath(window.location.pathname, "/landing");
  };
}

/** ===========================================================================
 * Styles and Helpers
 * ============================================================================
 */

const getCardButtonStyles = (isDesktop: boolean): React.CSSProperties => {
  const dimensions = isDesktop
    ? {
        width: 190,
        height: 190,
      }
    : {
        width: 145,
        height: 145,
      };

  return {
    ...dimensions,
    margin: 12,
    borderRadius: 0,
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
    borderColor: COLORS.CARD_BORDER,
  };
};

const LoginText = styled.h4`
  margin-top: 24px;
  font-size: 14px;
  text-align: center;
  color: ${(props: { theme: IThemeProps }) =>
    props.theme.isDarkTheme ? COLORS.LIGHT_WHITE : COLORS.DARK_TITLE};
`;

const InfoTextBottom = styled.p`
  font-weight: 100;
  font-size: 16px;
  text-align: center;
  margin: auto;
  max-width: 415px;
  margin-top: 12px;
  color: ${(props: { theme: IThemeProps }) =>
    props.theme.isDarkTheme ? Colors.LIGHT_GRAY3 : COLORS.DARK_TITLE};

  @media (max-width: 1080px) {
    max-width: 325px;
  }
`;

const WrappedRow = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

/** ===========================================================================
 * Props
 * ============================================================================
 */

const mapStateToProps = (state: ReduxStoreState) => ({
  i18n: i18nSelector(state),
  settings: Modules.selectors.settings(state),
  ledger: Modules.selectors.ledger.ledgerSelector(state),
  ledgerDialog: Modules.selectors.ledger.ledgerDialogSelector(state),
});

const dispatchProps = {
  openLedgerDialog: Modules.actions.ledger.openLedgerDialog,
  openSelectNetworkDialog: Modules.actions.ledger.openSelectNetworkDialog,
};

type ConnectProps = ReturnType<typeof mapStateToProps> & typeof dispatchProps;

const withProps = connect(mapStateToProps, dispatchProps);

interface ComponentProps {}

interface IProps extends ComponentProps, ConnectProps {}

/** ===========================================================================
 * Export
 * ============================================================================
 */

export default composeWithProps<ComponentProps>(withProps)(LoginStart);
