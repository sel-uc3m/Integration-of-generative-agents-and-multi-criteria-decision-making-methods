
-- Pandoc filter to resolve Typst cross-references (@sec:*, @fig:*, @tbl:*)

local ref_map = {
  ['sec:introduccion'] = 'Section 1',
  ['sec:related_work'] = 'Section 2',
  ['sec:metodologia'] = 'Section 3',
  ['sec:metodologia:motor'] = 'Section 3.1',
  ['sec:metodologia:algoritmos'] = 'Section 3.2',
  ['sec:evaluacion'] = 'Section 4',
  ['sec:evaluacion:configuracion'] = 'Section 4.1',
  ['sec:evaluacion:rq1'] = 'Section 4.2',
  ['sec:evaluacion:rq2'] = 'Section 4.3',
  ['sec:evaluacion:rq3'] = 'Section 4.4',
  ['sec:evaluacion:rq4'] = 'Section 4.5',
  ['sec:threats'] = 'Section 5',
  ['sec:conclusiones'] = 'Section 6',
  ['tbl:comparativa_enfoques'] = 'Table 1',
  ['fig:modelo_asincrono'] = 'Figure 1',
  ['fig:estados_motor'] = 'Figure 2',
  ['fig:altus_tradeoff'] = 'Figure 3',
  ['fig:sipac_f1'] = 'Figure 4',
  ['fig:ahp_quality'] = 'Figure 5',
  ['tbl:baseline_comparativa'] = 'Table 2',
}

function Inlines(inlines)
  local new_inlines = {}
  local i = 1
  while i <= #inlines do
    local el = inlines[i]
    if el.t == 'Cite' and #el.citations == 1 and (el.citations[1].id == 'sec' or el.citations[1].id == 'fig' or el.citations[1].id == 'tbl') then
      local prefix = el.citations[1].id
      local next_el = inlines[i+1]
      if next_el and next_el.t == 'Str' and next_el.text:sub(1,1) == ':' then
        local punct = next_el.text:match('[:%w_]+(.*)$') or ''
        local tag = next_el.text:match('^:([%w_]+)')
        local full_key = prefix .. ':' .. tag
        local resolved = ref_map[full_key] or (prefix .. ' ' .. tag)
        table.insert(new_inlines, pandoc.Str(resolved .. punct))
        i = i + 1
      else
        table.insert(new_inlines, el)
      end
    else
      table.insert(new_inlines, el)
    end
    i = i + 1
  end
  return new_inlines
end

function Meta(m)
  m.title = nil
  m.author = nil
  return m
end

local fig_count = 0
local tbl_count = 0

function Figure(fig)
  fig_count = fig_count + 1
  if fig.caption and fig.caption.long and #fig.caption.long > 0 then
    local p = fig.caption.long[1]
    if p.t == 'Para' or p.t == 'Plain' then
      local prefix = {
        pandoc.Strong({ pandoc.Str("Figure " .. fig_count .. ":") }),
        pandoc.Space()
      }
      for _, item in ipairs(p.content) do
        table.insert(prefix, item)
      end
      p.content = prefix
    end
  end
  return fig
end

function Table(tbl)
  tbl_count = tbl_count + 1
  if tbl.caption and tbl.caption.long and #tbl.caption.long > 0 then
    local p = tbl.caption.long[1]
    if p.t == 'Para' or p.t == 'Plain' then
      local prefix = {
        pandoc.Strong({ pandoc.Str("Table " .. tbl_count .. ":") }),
        pandoc.Space()
      }
      for _, item in ipairs(p.content) do
        table.insert(prefix, item)
      end
      p.content = prefix
    end
  end
  return tbl
end
