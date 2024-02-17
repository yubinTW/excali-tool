# Excali Tool

[![NPM version](https://img.shields.io/npm/v/excali-tool.svg?style=flat)](https://www.npmjs.com/package/excali-tool)

Some excalidraw function runs on Node.js. (Server Side)

## Install

https://www.npmjs.com/package/excali-tool

This library depends on [node-canvas](https://github.com/Automattic/node-canvas), see this [wiki](https://github.com/Automattic/node-canvas/wiki/_pages) for more installation information.

and install in your project

```
npm i excali-tool
```

## Usage

### convertToExcalidrawElements

```typescript
import { ExcalidrawElementSkeleton } from 'excali-tool/data/transform'
import { convertToExcalidrawElements } from 'excali-tool'

const rawData: Array<ExcalidrawElementSkeleton> = [
    {
        type: 'text',
        x: 100,
        y: 100,
        text: 'Hello world',
        customData: {
            createdBy: 'user1'
        }
    }
]
const convertedElements = convertToExcalidrawElements(rawData)
console.log(convertedElements)
```