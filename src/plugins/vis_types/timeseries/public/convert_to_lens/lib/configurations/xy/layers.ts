/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EventAnnotationConfig,
  FillTypes,
  XYAnnotationsLayerConfig,
  XYLayerConfig,
  YAxisMode,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import { PaletteOutput } from '@kbn/coloring';
import { v4 } from 'uuid';
import { transparentize } from '@elastic/eui';
import Color from 'color';
import { euiLightVars } from '@kbn/ui-theme';
import { groupBy } from 'lodash';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-plugin/public/data_views';
import { fetchIndexPattern } from '../../../../../common/index_patterns_utils';
import { ICON_TYPES_MAP } from '../../../../application/visualizations/constants';
import { SUPPORTED_METRICS } from '../../metrics';
import type { Annotation, Metric, Panel } from '../../../../../common/types';
import { getSeriesAgg } from '../../series';
import {
  isPercentileRanksColumnWithMeta,
  isPercentileColumnWithMeta,
  Column,
  Layer,
  AnyColumnWithReferences,
} from '../../convert';
import { getChartType } from './chart_type';

export const isColumnWithReference = (column: Column): column is AnyColumnWithReferences =>
  Boolean((column as AnyColumnWithReferences).references);

function getPalette(palette: PaletteOutput): PaletteOutput {
  return !palette || palette.name === 'gradient' || palette.name === 'rainbow'
    ? { name: 'default', type: 'palette' }
    : palette;
}

function getColor(
  metricColumn: Column,
  metric: Metric,
  seriesColor: string,
  splitAccessor?: string
) {
  if (isPercentileColumnWithMeta(metricColumn) && !splitAccessor) {
    const [_, percentileIndex] = metricColumn.meta.reference.split('.');
    return metric.percentiles?.[parseInt(percentileIndex, 10)]?.color;
  }
  if (isPercentileRanksColumnWithMeta(metricColumn) && !splitAccessor) {
    const [_, percentileRankIndex] = metricColumn.meta.reference.split('.');
    return metric.colors?.[parseInt(percentileRankIndex, 10)];
  }

  return seriesColor;
}

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export const getLayers = async (
  dataSourceLayers: Record<number, Layer>,
  model: Panel,
  dataViews: DataViewsPublicPluginStart
): Promise<XYLayerConfig[] | null> => {
  const nonAnnotationsLayers: XYLayerConfig[] = Object.keys(dataSourceLayers).map((key) => {
    const series = model.series[parseInt(key, 10)];
    const { metrics, seriesAgg } = getSeriesAgg(series.metrics);
    const dataSourceLayer = dataSourceLayers[parseInt(key, 10)];
    const referenceColumn = dataSourceLayer.columns.find(
      (column): column is AnyColumnWithReferences => isColumnWithReference(column)
    );
    // as pipiline aggregation has only one reference id
    const referenceColumnId = referenceColumn?.references[0];
    // we should not include columns which using as reference for pipeline aggs
    const metricColumns = dataSourceLayer.columns.filter(
      (l) => !l.isBucketed && l.columnId !== referenceColumnId
    );
    const isReferenceLine = metrics.length === 1 && metrics[0].type === 'static';
    const splitAccessor = dataSourceLayer.columns.find(
      (column) => column.isBucketed && column.isSplit
    )?.columnId;
    const chartType = getChartType(series, model.type);
    const commonProps = {
      seriesType: chartType,
      layerId: dataSourceLayer.layerId,
      accessors: metricColumns.map((metricColumn) => {
        return metricColumn.columnId;
      }),
      yConfig: metricColumns.map((metricColumn) => {
        const metric = metrics.find(
          (m) => SUPPORTED_METRICS[m.type]?.name === metricColumn.operationType
        );
        return {
          forAccessor: metricColumn.columnId,
          color: getColor(metricColumn, metric!, series.color, splitAccessor),
          axisMode: (series.separate_axis
            ? series.axis_position
            : model.axis_position) as YAxisMode,
          ...(isReferenceLine && {
            fill: chartType === 'area' ? FillTypes.BELOW : FillTypes.NONE,
          }),
        };
      }),
      xAccessor: dataSourceLayer.columns.find((column) => column.isBucketed && !column.isSplit)
        ?.columnId,
      splitAccessor,
      collapseFn: seriesAgg,
      palette: getPalette(series.palette as PaletteOutput),
    };
    if (isReferenceLine) {
      return {
        layerType: 'referenceLine',
        ...commonProps,
      };
    } else {
      return {
        layerType: 'data',
        ...commonProps,
      };
    }
  });
  if (!model.annotations || !model.annotations.length) {
    return nonAnnotationsLayers;
  }

  const annotationsByIndexPattern = groupBy(
    model.annotations,
    (a) => typeof a.index_pattern === 'object' && 'id' in a.index_pattern && a.index_pattern.id
  );

  try {
    const annotationsLayers: Array<XYAnnotationsLayerConfig | undefined> = await Promise.all(
      Object.entries(annotationsByIndexPattern).map(async ([indexPatternId, annotations]) => {
        const convertedAnnotations: EventAnnotationConfig[] = [];
        const { indexPattern } = (await fetchIndexPattern({ id: indexPatternId }, dataViews)) || {};

        if (indexPattern) {
          annotations.forEach((a: Annotation) => {
            const lensAnnotation = convertAnnotation(a, indexPattern);
            if (lensAnnotation) {
              convertedAnnotations.push(lensAnnotation);
            }
          });
          return {
            layerId: v4(),
            layerType: 'annotations',
            ignoreGlobalFilters: true,
            annotations: convertedAnnotations,
            indexPatternId,
          };
        }
      })
    );

    return nonAnnotationsLayers.concat(...annotationsLayers.filter(nonNullable));
  } catch (e) {
    return null;
  }
};

const convertAnnotation = (
  annotation: Annotation,
  dataView: DataView
): EventAnnotationConfig | undefined => {
  if (annotation.query_string) {
    const extraFields = annotation.fields
      ? annotation.fields
          ?.replace(/\s/g, '')
          ?.split(',')
          .map((field) => {
            const dataViewField = dataView.getFieldByName(field);
            return dataViewField && dataViewField.aggregatable ? field : undefined;
          })
          .filter(nonNullable)
      : undefined;
    return {
      type: 'query',
      id: annotation.id,
      label: 'Event',
      key: {
        type: 'point_in_time',
      },
      color: new Color(transparentize(annotation.color || euiLightVars.euiColorAccent, 1)).hex(),
      timeField: annotation.time_field,
      icon:
        annotation.icon &&
        ICON_TYPES_MAP[annotation.icon] &&
        typeof ICON_TYPES_MAP[annotation.icon] === 'string'
          ? ICON_TYPES_MAP[annotation.icon]
          : 'triangle',
      filter: {
        type: 'kibana_query',
        ...annotation.query_string,
      },
      extraFields,
      isHidden: annotation.hidden,
    };
  }
};
