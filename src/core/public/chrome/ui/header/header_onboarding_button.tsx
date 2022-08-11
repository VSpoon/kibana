/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButton,
  EuiText,
  EuiProgress,
  EuiAccordion,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTextColor,
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';

import type { HttpStart } from '@kbn/core-http-browser';

type OnboardingGuide = 'observability' | 'security' | 'search';

interface OnboardingSteps {
  title: string;
  url: string;
  description: string;
  status: 'incomplete' | 'complete' | 'in_progress';
}

// Expected data structure
const onboardingSteps: OnboardingSteps[] = [
  {
    title: 'Monitor your environment',
    url: '/',
    description:
      'Adding data is fast and easy with our out-of-the-box integrations. Quickly monitor popular cloud services, applications, systems, containers, and more.',
    status: 'complete',
  },
  {
    title: 'Tour Elastic Observability',
    url: '/',
    description:
      'See how you can easily unlock the power of the Elastic search platform to query your logs, view your infrastructure, monitor your applications, visualize your data, and more.',
    status: 'in_progress',
  },
  {
    title: 'Collaborate with your team',
    url: '/',
    description: 'Invite your teammates and explore Elastic together.',
    status: 'incomplete',
  },
  {
    title: 'Do more with Observability',
    url: '/',
    description:
      'See how you can enhance visibility into your environment with capabilities from Elastic like Application Performance Monitoring (APM), Uptime Monitoring, and more.',
    status: 'incomplete',
  },
];

export const HeaderOnboardingButton = ({ http }: { http: HttpStart }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<OnboardingGuide | undefined>(undefined);

  console.log({ http });
  http.get('/api/guided_onboarding/state').then((res) => {
    // Use the core notifications service to display a success message.

    setActiveGuide(res.state.active_guide);
  });
  const { euiTheme } = useEuiTheme();

  const togglePopover = () => {
    setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
  };

  const popoverContainerCss = css`
    width: 400px;
  `;

  const statusCircleCss = ({ status }: { status: OnboardingSteps['status'] }) => css`
    width: 24px;
    height: 24px;
    border-radius: 32px;
    ${(status === 'complete' || status === 'in_progress') &&
    `background-color: ${euiTheme.colors.success};`}
    ${status === 'incomplete' &&
    `
      border: 2px solid ${euiTheme.colors.lightShade};
    `}
  `;

  return (
    <EuiPopover
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={togglePopover}
          color="success"
          fill
          isDisabled={!activeGuide}
        >
          Guided setup
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downCenter"
    >
      <EuiPopoverTitle>
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={() => {}}
              iconSide="left"
              iconType="arrowLeft"
              isDisabled={true}
            >
              Back to guides
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>Guide for {activeGuide}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>

      <div css={popoverContainerCss}>
        <EuiText>
          <p>
            {`We'll help you quickly gain visibility into your environment using Elastic's
            out-of-the-box integrations. Gain deep insights from your logs, metrics, and traces, and
            proactively detect issues and take action.`}
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiProgress label="Progress" value={40} max={100} size="l" valueText />
        <EuiSpacer />
        {onboardingSteps.map((step, index) => {
          const accordionId = htmlIdGenerator(`accordion${index}`)();

          const buttonContent = (
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <span css={statusCircleCss({ status: step.status })} className="eui-textCenter">
                  <span className="euiScreenReaderOnly">{step.status}</span>
                  {step.status === 'complete' && <EuiIcon type="check" color="white" />}
                </span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{step.title}</EuiFlexItem>
            </EuiFlexGroup>
          );

          return (
            <div>
              <EuiAccordion id={accordionId} buttonContent={buttonContent} arrowDisplay="right">
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="s">{step.description}</EuiText>
                </>
              </EuiAccordion>

              {/* Do not show horizontal rule for last item */}
              {onboardingSteps.length - 1 !== index && <EuiHorizontalRule />}
            </div>
          );
        })}
        <EuiPopoverFooter>
          <EuiText size="xs" textAlign="center">
            <EuiTextColor color="subdued">
              <p>{`Got questions? We're here to help.`}</p>
            </EuiTextColor>
          </EuiText>
        </EuiPopoverFooter>
      </div>
    </EuiPopover>
  );
};
