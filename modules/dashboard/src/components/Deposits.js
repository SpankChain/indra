import React, { Component } from "react";
//import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
//import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import get from "../get";
import { VictoryChart, VictoryLine, VictoryLabel, VictoryAxis } from "victory";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from "@material-ui/core/Button";


const styles = theme => ({
  card: {
    minWidth: 275,
    textAlign: "left",
    marginBottom:"3%"
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.unit * 3,
    height: "100vh",
    overflow: "auto"
  },
});

class Deposits extends Component {
  constructor(props) {
    super(props);
    this.state = {
      depositAverageWei: {
        raw:null,
        formatted:null
      },
      depositAverageToken: {
        raw:null,
        formatted:null
      },
      depositTotal: null,
      DepositFrequency:null,
      freqArray: []
    };
  }

  setAverage = async () => {
    const { web3 } = this.props;

    const res = await get(`deposits/average`);
    if (res && res.avg_deposit_wei && res.avg_deposit_token) {
      let tokenDeposit = String(Math.trunc(res.avg_deposit_token))
      let weiDeposit = String(Math.trunc(res.avg_deposit_wei))
      this.setState(state => {
        state.depositAverageToken.raw = res.avg_deposit_token
        state.depositAverageToken.formatted = web3.utils.fromWei(tokenDeposit);
        state.depositAverageWei.raw = res.avg_deposit_wei
        state.depositAverageWei.formatted = web3.utils.fromWei(weiDeposit);
        return state
      });
    } else {
      this.setState(state => {
        state.depositAverageToken.formatted= "N/A"
        state.depositAverageWei.formatted= "N/A"
        return state
      });
    }
  };

  setTotal = async () => {
    const res = await get(`deposits/total`);
    if (res && res.count) {
      this.setState({ depositTotal: res.count });
    } else {
      this.setState({ depositTotal: "N/A" });
    }
  };

  setFrequency = async() =>{
    const res = get(`deposits/frequency`);
    if (res.data){
      this.setState({freqArray: res.data})
    }
  }

  setChart = () => {

    if (this.state.freqArray) {
      // TESTING DATA
      // let data = [
      //   {day:"1", count:10},
      //   {day:"2", count:14},
      //   {day:"3", count:8}
      // ]

    const toRender = (
      <VictoryChart width={140} height={140}
      style={{
        labels:{
          fontSize:4
        }
      }}>
        <VictoryLabel x={50} y={40}
          text="Deposits this Week"
          style={{fontSize:4}}
        />
        <VictoryLine
          
          x="day"
          y="count"
          standalone={false}
          style={{ data: { strokeWidth: 0.1 } }}
          data={this.state.freqArray}
        />
        <VictoryAxis
          domain={{y: [0, 100] }}
          dependentAxis={true}
          label="Deposits"
          style={{ axisLabel: { fontSize: 2 }, tickLabels: { fontSize: 2 } }}
        />
        <VictoryAxis
          dependentAxis={false}
          domain={{ x: [0, 7]}}
          tickValues={[0, 1, 2, 3, 4, 5, 6, 7]}
          label="Day"
          style={{ axisLabel: { fontSize: 2 }, tickLabels: { fontSize: 2 } }}
        />
  </VictoryChart> 
    ); 

    console.log(toRender);
    return toRender
    } else {
      console.warn(`Missing data for chart`)
    }
  };

  _handleRefresh = async () => {
    await this.setTotal();
    await this.setAverage();
    await this.setFrequency();
    this.setState({ DepositFrequency: this.setChart()});

  };

  componentDidMount = async () => {
    await this.setTotal();
    await this.setAverage();
    await this.setFrequency();
    this.setState({ DepositFrequency: this.setChart()});

  };

  render = () => {
    const { classes } = this.props;
    const {DepositFrequency} =  this.state
    return (
      <div className={classes.content}>
      <Card className={classes.card}>
      <CardContent>
        <Typography variant="h5" style={{marginBotton:"5%"}}>Deposit Summary Statistics</Typography>
            <Table className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>
                    <Typography variant="h6"> Value </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">Count</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                    {this.state.depositTotal}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">Average Token Value</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                  {this.state.depositAverageToken.formatted}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">Average ETH Value</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                  {this.state.depositAverageWei.formatted}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
          <Button variant="contained" onClick={() =>this._handleRefresh()}>
            Refresh
          </Button>
      </Card>
      <Card className={classes.card}>
      <div style={{marginTop:"-20%"}}>
            {DepositFrequency}
            </div>
      </Card>
      </div>
    );
  }
}

export const DepositsStyled = withStyles(styles)(Deposits);
