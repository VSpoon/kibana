/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { parseTimeShift } from '@kbn/data-plugin/common';
import { getIndexPatternIds, Layer } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { PANEL_TYPES } from '../../../common/enums';
import { getDataViewsStart } from '../../services';
import { getDataSourceInfo } from '../lib/datasource';
import { getMetricsColumns, getBucketsColumns } from '../lib/series';
import { getConfigurationForTopN as getConfiguration, getLayers } from '../lib/configurations/xy';
import { getReducedTimeRange, isValidMetrics } from '../lib/metrics';
import { ConvertTsvbToLensVisualization } from '../types';
import { Layer as ExtendedLayer, excludeMetaFromColumn } from '../lib/convert';

const excludeMetaFromLayers = (layers: Record<string, ExtendedLayer>): Record<string, Layer> => {
  const newLayers: Record<string, Layer> = {};
  Object.entries(layers).forEach(([layerId, layer]) => {
    const columns = layer.columns.map(excludeMetaFromColumn);
    newLayers[layerId] = { ...layer, columns };
  });

  return newLayers;
};

export const convertToLens: ConvertTsvbToLensVisualization = async (model, timeRange) => {
  const dataViews = getDataViewsStart();
  const extendedLayers: Record<number, ExtendedLayer> = {};
  const seriesNum = model.series.filter((series) => !series.hidden).length;

  // handle multiple layers/series
  for (const [layerIdx, series] of model.series.entries()) {
    if (series.hidden) {
      continue;
    }

    // not valid time shift
    if (series.offset_time && parseTimeShift(series.offset_time) === 'invalid') {
      return null;
    }

    if (!isValidMetrics(series.metrics, PANEL_TYPES.TOP_N, series.time_range_mode)) {
      return null;
    }

    const datasourceInfo = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(series.override_index_pattern),
      series.series_index_pattern,
      series.series_time_field,
      dataViews
    );

    if (!datasourceInfo) {
      return null;
    }

    const { indexPatternId, indexPattern } = datasourceInfo;
    const reducedTimeRange = getReducedTimeRange(model, series, timeRange);

    // handle multiple metrics
    const metricsColumns = getMetricsColumns(series, indexPattern!, seriesNum, reducedTimeRange);
    if (!metricsColumns) {
      return null;
    }

    const bucketsColumns = getBucketsColumns(model, series, metricsColumns, indexPattern!, false);
    if (bucketsColumns === null) {
      return null;
    }

    const layerId = uuid();
    extendedLayers[layerIdx] = {
      indexPatternId,
      layerId,
      columns: [...metricsColumns, ...bucketsColumns],
      columnOrder: [],
    };
  }

  const configLayers = await getLayers(extendedLayers, model, dataViews);
  if (configLayers === null) {
    return null;
  }

  const layers = Object.values(excludeMetaFromLayers(extendedLayers));
  return {
    type: 'lnsXY',
    layers,
    configuration: getConfiguration(model, configLayers),
    indexPatternIds: getIndexPatternIds(layers),
  };
};
