import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import { TextField } from "@material-ui/core";
//import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import get from "../get";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { VictoryChart, VictoryLine, VictoryLabel, VictoryAxis } from "victory";


const styles = theme => ({
  card: {
    minWidth: "40%",
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

class PaymentInfoCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      totalPayments: null,
      paymentsLastDay: null,
      averagePaymentWei: {
        raw:null,
        formatted:null
      },
      averagePaymentToken: {
        raw:null,
        formatted:null
      },
      averagePaymentWeiLastDay: {
        raw:null,
        formatted:null
      },
      averagePaymentTokenLastDay: {
        raw:null,
        formatted:null
      },
      idInput: "",
      paymentInfo: null,
      freqArray: null
    };
  }

  setTotal = async () => {
    const res = await get(`payments/total`);
    if (res) {
      this.setState({ totalPayments: res.count });
    } else {
      this.setState({ totalPayments: 0 });
    }
  };

  setTrailing = async () => {
    const res = await get(`payments/trailing24`);
    if (res) {
      this.setState({ paymentsLastDay: res.count });
    } else {
      this.setState({ paymentsLastDay: "N/A" });
    }
  };

  setAverage = async () => {
    const {web3} = this.props;
    const res = await get(`payments/average/all`);
    if (res && res.avg_wei_payment && res.avg_token_payment) {
      let tokenDeposit = web3.utils.toBN(Math.trunc(res.avg_token_payment));
      let weiDeposit = web3.utils.toBN(Math.trunc(res.avg_wei_payment));
      this.setState(state => {
        state.averagePaymentWei.raw = res.avg_wei_payment
        state.averagePaymentToken.raw = res.avg_token_payment
        state.averagePaymentWei.formatted = web3.utils.fromWei(weiDeposit)
        state.averagePaymentToken.formatted = web3.utils.fromWei(tokenDeposit)
        return state
      });
    } else {
      this.setState(state => {
        state.averagePaymentWei.formatted = "N/A"
        state.averagePaymentToken.formatted = "N/A"
        return state
      });
    }
  };

  setAverageTrailing = async () => {
    const {web3} = this.props;

    const res = await get(`payments/average/trailing24`);
    if (res && res.avg_wei_payment && res.avg_token_payment) {
      let tokenPayment = String(Math.trunc(res.avg_token_payment));
      let weiPayment = String(Math.trunc(res.avg_wei_payment));
      this.setState(state => {
        state.averagePaymentWeiLastDay.raw = res.avg_wei_payment
        state.averagePaymentTokenLastDay.raw = res.avg_token_payment
        state.averagePaymentWeiLastDay.formatted = web3.utils.fromWei(weiPayment)
        state.averagePaymentTokenLastDay.formatted = web3.utils.fromWei(tokenPayment)
        return state
      });
    } else {
      this.setState(state =>{
        state.averagePaymentWeiLastDay.formatted = "N/A"
        state.averagePaymentTokenLastDay.formatted = "N/A"
        return state
      });
    }
  };

  searchById = async id => {
    const res = await get(`payments/${id}`);
    if (res.length>0) {
      this.setState({ paymentInfo: res });
    } else {
      this.setState({ paymentInfo: "ID not found" });
    }
  };

  setFrequency = async() =>{
    const res = await get(`payments/frequency`);
    if (res.data){
      this.setState({freqArray: res.data})
    }
  }

  setChart = () => {
    // TESTING DATA
    // let data = [
    //   { day: 1, count: 10 },
    //   { day: 2, count: 14 },
    //   { day: 3, count: 8 }
    // ];
    // const toRender = (
    //   <VictoryChart width={140} height={140}
    //     style={{
    //       labels:{
    //         fontSize:4
    //       }
    //     }}>
    //       <VictoryLabel x={50} y={40}
    //         text="Payments this Week"
    //         style={{fontSize:4}}
    //       />
    //       <VictoryLine
            
    //         x="day"
    //         y="count"
    //         standalone={false}
    //         style={{ data: { strokeWidth: 0.1 } }}
    //         data={data}
    //       />
    //       <VictoryAxis
    //         domain={{y: [0, 100] }}
    //         dependentAxis={true}
    //         label="Withdrawals"
    //         style={{ axisLabel: { fontSize: 2 }, tickLabels: { fontSize: 2 } }}
    //       />
    //       <VictoryAxis
    //         dependentAxis={false}
    //         domain={{ x: [0, 7]}}
    //         tickValues={[0, 1, 2, 3, 4, 5, 6, 7]}
    //         label="Day"
    //         style={{ axisLabel: { fontSize: 2 }, tickLabels: { fontSize: 2 } }}
    //       />
    // </VictoryChart> 
    // );
    // console.log(toRender);
    // return toRender;

    
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
            text="Payments this Week"
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
            label="Withdrawals"
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
      //this.setState({ withdrawalBreakdown: JSON.stringify(res) });
    } else {
      console.warn(`Missing data for chart`)
    }
  };

  handleChange = evt => {
    this.setState({ idInput: evt.target.value });
  };

  _handleRefresh = async () => {
    await this.setTrailing();
    await this.setTotal();
    await this.setAverage();
    await this.setAverageTrailing();
    //await this.setFrequency();
  };

  componentDidMount = async () => {
    await this.setTrailing();
    await this.setTotal();
    await this.setAverage();
    await this.setAverageTrailing();
    //await this.setFrequency();
  };

  render() {
    const { classes } = this.props;
    const PaymentFrequency = this.setChart();

    return (
      <div className={classes.content}>
      <Card className={classes.card}>
      <CardContent>
        <Typography variant="h5" style={{marginBotton:"5%"}}>Payment Summary Statistics</Typography>
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
                  {this.state.totalPayments}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">Average Token Payment</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                  {this.state.averagePaymentToken.formatted}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">Average ETH Payment</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                  {this.state.averagePaymentWei.formatted}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">Count (Last 24 hours)</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                  {this.state.paymentsLastDay}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">Average Token Payment (Last 24 hours)</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                  {this.state.averagePaymentTokenLastDay.formatted}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    <Typography variant="h6">Average ETH Payment (Last 24 hours)</Typography>
                  </TableCell>
                  <TableCell component="th" scope="row">
                  {this.state.averagePaymentWeiLastDay.formatted}
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
      <CardContent>
        <Typography variant="h5" style={{marginBotton:"5%"}}>Payment Search</Typography>
          <div>
            <TextField
              id="outlined"
              label="Purchase ID"
              value={this.state.idInput}
              onChange={evt => this.handleChange(evt)}
              margin="normal"
              variant="outlined"
            />
            <Button variant="contained" onClick={() => this.searchById(this.state.idInput)}>Search</Button>
          </div>
          <div>
            {this.state.paymentInfo ? (
              <Typography variant="body1">{this.state.paymentInfo}</Typography>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <Card className={classes.card}>
      <div style={{marginTop:"-20%"}}>

       {PaymentFrequency}
      </div>
      </Card>
      </div>
    );
  }
}

export const PaymentInfoCardStyled = withStyles(styles)(PaymentInfoCard);
