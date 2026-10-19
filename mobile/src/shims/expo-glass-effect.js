import React from 'react';
import { View } from 'react-native';

export function GlassView(props) {
  return React.createElement(View, props);
}

export function GlassContainer(props) {
  return React.createElement(View, props);
}

export function isLiquidGlassAvailable() {
  return false;
}

export function isGlassEffectAPIAvailable() {
  return false;
}

export default {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
};
