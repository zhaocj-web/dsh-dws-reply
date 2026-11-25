import React from 'react';
import type { ReplyStyle } from '../../shared/types';
import { presetReplyStyles } from '../../shared/reply-styles';
import { FormItem, Select } from './Form';

type ReplyStyleSelectProps = {
  value: string | null;
  styles: ReplyStyle[];
  inherit?: boolean;
  onChange: (value: string | null) => void;
};

export function ReplyStyleSelect(props: ReplyStyleSelectProps) {
  return (
    <FormItem label="回复风格">
      <Select
        value={props.value ?? ''}
        onChange={(event) => props.onChange(event.target.value || null)}
      >
        <option value="">{props.inherit ? '跟随全局风格' : '不使用风格'}</option>
        {[...presetReplyStyles, ...props.styles].map((style) => (
          <option key={style.id} value={style.id}>
            {style.name}
          </option>
        ))}
      </Select>
    </FormItem>
  );
}
