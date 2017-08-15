from __future__ import print_function
import plotly.plotly as py
import plotly.graph_objs as go
import pandas as pd
import numpy as np
from scipy import stats
from datetime import datetime, timedelta
from colourlovers import ColourLovers

cl = ColourLovers()
pal1 = cl.palette(113451)
pal2 = cl.palette(629637)
cs = pal1[0].colours
cs2 = pal2[0].colours

df = pd.read_csv('prosjekt-kinderegg/stats.csv')

df['date'] = pd.to_datetime(df['date'])


def add_lin(col='total_terms', days=30, line_color='rgb(205, 12, 24)'):
    tmp = df[df[col].notnull()]
    tmp = tmp[tmp['date'] > (datetime.now() - timedelta(days=days))]
    xi = np.array( (tmp['date'] - df['date'].min())  / np.timedelta64(1,'D') )
    print(xi)
    y = np.array(tmp[col])

    slope, intercept, r_value, p_value, std_err = stats.linregress(xi, y)
    line = slope * xi + intercept
    print('Datapoints: ', len(xi), '. Slope: ', slope)

    return go.Scatter(
                  x=tmp['date'],
                  y=line,
                  mode='lines',
                  name='Last %d days: %.1f terms/day' % (days, slope),
                  line={
                      'color': (line_color),
                      'width': 1,
                  })


annotations=[]
# annotation = go.Annotation(
#                   x=datetime(2017,5,1),
#                   y=1400,
#                   text='$R^2 = 0.9551,\\Y = 0.716X + 19.18$',
#                   showarrow=False,
#                   font=go.Font(size=16)
#                   )

# -----------------------------------------------------------------------------------

trace = go.Scatter(x=df['date'],
                   y=df['total_terms'],
                   name='Terms translated',
                   mode='lines',
                   line={
                       'shape': 'hv',
                       'width': 2,
                       'color': (cs[0]),
                   })

data = [
    trace,
    add_lin('total_terms', 14, cs[1]),
    add_lin('total_terms', 30, cs[2]),
    add_lin('total_terms', 120, cs[3]),
]

layout = go.Layout(title='Prosjekt Kinderegg: Terms translated',
                   showlegend=True,
                   font=dict(size=18, color='#7f7f7f'),
                   xaxis={
                       'showline': True,
                       'fixedrange': True,
                       'range': [df['date'].min(), df['date'].max() + timedelta(days=3)],
                       'autotick': True,
                       'ticks': 'outside',
                   },
                   yaxis={
                       'showline': True,
                       'fixedrange': True,
                       'range': [0, 1.05 * df['total_terms'].max()],
                       'autotick': True,
                       'ticks': 'outside',
                   },
	           annotations=annotations)

fig = go.Figure(data=data, layout=layout)

py.plot(fig, filename='kinderegg_terms_translated', auto_open=False)
py.image.save_as(fig,'prosjekt-kinderegg/terms_translated.png', scale=1.5)

# -----------------------------------------------------------------------------------------------

data = [
    go.Scatter(x=df['date'],
               y=df['total_terms'],
               name='Terms translated',
               mode='lines',
               line={
                  'shape': 'hv',
                  'width': 1.5,
                  'color': (cs[0]),
              }),
    go.Scatter(x=df['date'],
               y=df['proofread_terms'],
               name='Terms proofread',
               mode='lines',
               line={
                  'shape': 'hv',
                  'width': 1.5,
                  'color': (cs2[0]),
              }),
    add_lin('total_terms', 14, cs[1]),
    add_lin('total_terms', 30, cs[2]),
    add_lin('total_terms', 120, cs[3]),
]

layout = go.Layout(title='Prosjekt Kinderegg: Terms processed',
                   showlegend=True,
                   font=dict(size=18, color='#7f7f7f'),
                   xaxis={
                       'showline': True,
                       'fixedrange': True,
                       'range': [df['date'].min(), df['date'].max() + timedelta(days=3)],
                       'autotick': True,
                       'ticks': 'outside',
                   },
                   yaxis={
                       'showline': True,
                       'fixedrange': True,
                       'range': [0, 1.05 * df['total_terms'].max()],
                       'autotick': True,
                       'ticks': 'outside',
                   },
	           annotations=annotations)

fig = go.Figure(data=data, layout=layout)

py.plot(fig, filename='kinderegg_terms', auto_open=False)
py.image.save_as(fig,'prosjekt-kinderegg/terms.png', scale=1.5)

# -----------------------------------------------------------------------------------------------

data = [
    go.Scatter(x=df['date'],
               y=df['total_concepts'],
               name='Concepts translated',
               mode='lines',
               line={
                  'shape': 'hv',
                  'width': 1.5,
                  'color': (cs[0]),
              }),
    go.Scatter(x=df['date'],
               y=df['categorized'],
               name='Concepts categorized',
               mode='lines',
               line={
                  'shape': 'hv',
                  'width': 1.5,
                  'color': (cs[3]),
              }),
    go.Scatter(x=df['date'],
               y=df['wikidata_mappings'],
               name='Wikidata mappings',
               mode='lines',
               line={
                  'shape': 'hv',
                  'width': 1.5,
                  'color': (cs[2]),
              }),
    go.Scatter(x=df['date'],
               y=df['proofread_concepts'],
               name='Concepts proofread',
               mode='lines',
               line={
                  'shape': 'hv',
                  'width': 1.5,
                  'color': (cs2[0]),
              }),
]

layout = go.Layout(title='Prosjekt Kinderegg: Concepts processed',
                   showlegend=True,
                   font=dict(size=18, color='#7f7f7f'),
                   xaxis={
                       'showline': True,
                       'fixedrange': True,
                       'range': [df['date'].min(), df['date'].max() + timedelta(days=3)],
                       'autotick': True,
                       'ticks': 'outside',
                   },
                   yaxis={
                       'showline': True,
                       'fixedrange': True,
                       'range': [0, 1.05 * df['total_terms'].max()],
                       'autotick': True,
                       'ticks': 'outside',
                   },
	           annotations=annotations)

fig = go.Figure(data=data, layout=layout)

py.plot(fig, filename='kinderegg_concepts', auto_open=False)
py.image.save_as(fig,'prosjekt-kinderegg/concepts.png', scale=1.5)

