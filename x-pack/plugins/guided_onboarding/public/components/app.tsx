/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from 'react-router-dom';

import {
  EuiButton,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';

interface GuidedOnboardingAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const GuidedOnboardingApp = ({
  basename,
  notifications,
  http,
  navigation,
}: GuidedOnboardingAppDeps) => {
  // Use React hooks to manage state.
  const [guidedOnboardingState, setGuidedOnboardingState] = useState<string | undefined>();

  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    http.get('/api/guided_onboarding/state').then((res) => {
      // Use the core notifications service to display a success message.
      notifications.toasts.addSuccess(
        i18n.translate('guidedOnboarding.dataUpdated', {
          defaultMessage: 'Data loaded',
        })
      );
      setGuidedOnboardingState(JSON.stringify(res, null, 2));
    });
  };

  const sendUpdateRequest = () => {
    // Use the core http service to make a response to the server API.
    http
      .put('/api/guided_onboarding/state', {
        body: JSON.stringify({
          active_guide: 'observability',
          active_step: 1,
        }),
      })
      .then((res) => {
        // Use the core notifications service to display a success message.
        notifications.toasts.addSuccess(
          i18n.translate('guidedOnboarding.dataUpdated', {
            defaultMessage: 'Data updated',
          })
        );
        setGuidedOnboardingState(JSON.stringify(res, null, 2));
      });
  };

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu
            appName={PLUGIN_ID}
            showSearchBar={true}
            useDefaultBehaviors={true}
          />
          <EuiPage restrictWidth="1000px">
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="guidedOnboarding.helloWorldText"
                      defaultMessage="{name}"
                      values={{ name: PLUGIN_NAME }}
                    />
                  </h1>
                </EuiTitle>
              </EuiPageHeader>
              <EuiPageContent>
                <EuiPageContentHeader>
                  <EuiTitle>
                    <h2>
                      <FormattedMessage
                        id="guidedOnboarding.congratulationsTitle"
                        defaultMessage="Congratulations, you have successfully created a new Kibana Plugin!"
                      />
                    </h2>
                  </EuiTitle>
                </EuiPageContentHeader>
                <EuiPageContentBody>
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="guidedOnboarding.content"
                        defaultMessage="Look through the generated code and check out the plugin development documentation."
                      />
                    </p>
                    <EuiHorizontalRule />
                    <p>
                      <FormattedMessage
                        id="guidedOnboarding.timestampText"
                        defaultMessage="State: {state}"
                        values={{ state: guidedOnboardingState ?? 'Unknown' }}
                      />
                    </p>
                    <EuiButton type="primary" size="s" onClick={onClickHandler}>
                      <FormattedMessage
                        id="guidedOnboarding.buttonText"
                        defaultMessage="Get data"
                      />
                    </EuiButton>

                    <EuiButton type="secondary" size="s" onClick={sendUpdateRequest}>
                      <FormattedMessage
                        id="guidedOnboarding.buttonText"
                        defaultMessage="Update data"
                      />
                    </EuiButton>
                  </EuiText>
                </EuiPageContentBody>
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </>
      </I18nProvider>
    </Router>
  );
};
